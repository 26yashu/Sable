// =============================================
// Sable — Reminder Service
// CRUD + scheduling logic for daily, weekly
// reflection, and mood check-in reminders.
// Supports anonymous and authenticated owners
// identically via ownerId/ownerType.
// =============================================

import Reminder, { REMINDER_TYPE_VALUES } from '../models/Reminder.js'

// ── Default copy per reminder type ────────────────────────────────────────────
// Used when a reminder has no custom label set.

export const DEFAULT_REMINDER_COPY = {
  daily: {
    title:       'Daily check-in',
    description: 'A gentle nudge to pause and notice how you\'re doing today.',
    defaultTime: '09:00',
  },
  weeklyReflection: {
    title:       'Weekly reflection',
    description: 'A quiet moment at the end of the week to look back on your patterns.',
    defaultTime: '18:00',
  },
  moodCheckIn: {
    title:       'Mood check-in',
    description: 'A simple reminder to log how you\'re feeling right now.',
    defaultTime: '20:00',
  },
}

// ── Validation helpers ────────────────────────────────────────────────────────

function isValidType(type) {
  return REMINDER_TYPE_VALUES.includes(type)
}

function isValidTime(timeOfDay) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeOfDay)
}

// ── Next-trigger computation ──────────────────────────────────────────────────

/**
 * Compute the next UTC instant a reminder should fire, given its
 * timeOfDay ("HH:mm"), optional dayOfWeek (for weekly reminders),
 * and IANA timezone. Pure function — no DB access.
 *
 * Uses Intl APIs to resolve timezone offsets rather than a fixed
 * UTC offset, so DST transitions are handled correctly.
 *
 * @param {{
 *   type: string,
 *   timeOfDay: string,
 *   dayOfWeek?: number,
 *   timezone?: string,
 * }} reminder
 * @param {Date} [from] — reference point, defaults to now
 * @returns {Date}
 */
export function computeNextTrigger(reminder, from = new Date()) {
  const { type, timeOfDay, dayOfWeek = 0, timezone = 'UTC' } = reminder
  const [hour, minute] = timeOfDay.split(':').map(Number)

  // Resolve "now" in the target timezone using Intl, then build a candidate
  // date in that local time, then convert back to an absolute UTC Date.
  const candidate = zonedTimeToCandidate(from, timezone, hour, minute)

  if (type === 'weeklyReflection') {
    // Advance to the target day-of-week, today included if it's still ahead
    const candidateDow = getZonedWeekday(candidate, timezone)
    let dayDelta = (dayOfWeek - candidateDow + 7) % 7

    if (dayDelta === 0 && candidate <= from) {
      dayDelta = 7 // today's slot has already passed — push to next week
    }

    candidate.setUTCDate(candidate.getUTCDate() + dayDelta)
    return candidate
  }

  // daily / moodCheckIn — if today's slot has passed, roll to tomorrow
  if (candidate <= from) {
    candidate.setUTCDate(candidate.getUTCDate() + 1)
  }

  return candidate
}

/**
 * Build a UTC Date representing `hour:minute` local time in `timezone`,
 * anchored to the same calendar day as `from` in that timezone.
 */
function zonedTimeToCandidate(from, timezone, hour, minute) {
  // Get the date parts as seen in the target timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(from)

  const y = parts.find(p => p.type === 'year').value
  const m = parts.find(p => p.type === 'month').value
  const d = parts.find(p => p.type === 'day').value

  // Construct an ISO-like string for that local date + desired time,
  // then resolve the timezone offset for that instant.
  const naiveLocal = new Date(`${y}-${m}-${d}T${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:00`)

  const offsetMinutes = getTimezoneOffsetMinutes(naiveLocal, timezone)
  return new Date(naiveLocal.getTime() - offsetMinutes * 60000)
}

/**
 * Returns the offset (in minutes) of `timezone` relative to UTC at the
 * given naive local Date. Positive = ahead of UTC.
 */
function getTimezoneOffsetMinutes(naiveLocalDate, timezone) {
  const utcDate = new Date(naiveLocalDate.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate  = new Date(naiveLocalDate.toLocaleString('en-US', { timeZone: timezone }))
  return (tzDate.getTime() - utcDate.getTime()) / 60000
}

/** Returns the day-of-week (0–6, Sun–Sat) for `date` as seen in `timezone`. */
function getZonedWeekday(date, timezone) {
  const weekdayStr = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(date)
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return map[weekdayStr] ?? 0
}

// ── Owner resolution (mirrors other controllers) ──────────────────────────────

export function resolveOwner(req) {
  if (req.user) return { ownerId: String(req.user._id), ownerType: 'user' }
  const anonId = req.headers['x-anon-id']
  if (anonId && /^[0-9a-f-]{36}$/i.test(anonId)) {
    return { ownerId: anonId, ownerType: 'anonymous' }
  }
  return null
}

// ── Public API: CRUD ──────────────────────────────────────────────────────────

/**
 * List all reminders for an owner. Returns the three default types even
 * if not yet created, marked as not-yet-configured (id: null, enabled: false),
 * so the frontend always has a consistent three-card shape to render.
 */
export async function listReminders(owner) {
  const existing = await Reminder.find({ ownerId: owner.ownerId }).lean()
  const byType   = Object.fromEntries(existing.map(r => [r.type, r]))

  return REMINDER_TYPE_VALUES.map((type) => {
    const doc = byType[type]
    if (doc) {
      return {
        id:              doc._id,
        type:            doc.type,
        enabled:         doc.enabled,
        timeOfDay:       doc.timeOfDay,
        dayOfWeek:       doc.dayOfWeek,
        timezone:        doc.timezone,
        label:           doc.label || DEFAULT_REMINDER_COPY[type].title,
        description:     DEFAULT_REMINDER_COPY[type].description,
        lastTriggeredAt: doc.lastTriggeredAt,
        nextTriggerAt:   doc.nextTriggerAt,
        isConfigured:    true,
      }
    }
    // Not yet created — return a default shape for the UI
    return {
      id:              null,
      type,
      enabled:         false,
      timeOfDay:       DEFAULT_REMINDER_COPY[type].defaultTime,
      dayOfWeek:       0,
      timezone:        'UTC',
      label:           DEFAULT_REMINDER_COPY[type].title,
      description:     DEFAULT_REMINDER_COPY[type].description,
      lastTriggeredAt: null,
      nextTriggerAt:   null,
      isConfigured:    false,
    }
  })
}

/**
 * Create or update a reminder for an owner + type (upsert).
 * Recomputes nextTriggerAt whenever schedule-relevant fields change.
 *
 * @param {{ ownerId: string, ownerType: string }} owner
 * @param {{
 *   type: string,
 *   enabled?: boolean,
 *   timeOfDay?: string,
 *   dayOfWeek?: number,
 *   timezone?: string,
 *   label?: string,
 * }} input
 */
export async function upsertReminder(owner, input) {
  const { type, enabled, timeOfDay, dayOfWeek, timezone, label } = input

  if (!isValidType(type)) {
    throw Object.assign(new Error(`Invalid reminder type: ${type}`), { status: 400 })
  }
  if (timeOfDay !== undefined && !isValidTime(timeOfDay)) {
    throw Object.assign(new Error('timeOfDay must be in HH:mm 24-hour format'), { status: 400 })
  }

  const update = {
    ...owner,
    type,
    ...(enabled   !== undefined ? { enabled }   : {}),
    ...(timeOfDay !== undefined ? { timeOfDay } : {}),
    ...(dayOfWeek !== undefined ? { dayOfWeek } : {}),
    ...(timezone  !== undefined ? { timezone }  : {}),
    ...(label     !== undefined ? { label }     : {}),
  }

  const reminder = await Reminder.findOneAndUpdate(
    { ownerId: owner.ownerId, type },
    { $set: update },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  )

  // Recompute schedule if the reminder is enabled
  if (reminder.enabled) {
    reminder.nextTriggerAt = computeNextTrigger(reminder)
    await reminder.save()
  } else {
    reminder.nextTriggerAt = null
    await reminder.save()
  }

  return reminder.toSafeObject()
}

/**
 * Delete a reminder configuration (resets to default/unconfigured state).
 */
export async function deleteReminder(owner, type) {
  if (!isValidType(type)) {
    throw Object.assign(new Error(`Invalid reminder type: ${type}`), { status: 400 })
  }
  await Reminder.findOneAndDelete({ ownerId: owner.ownerId, type })
  return { success: true }
}

/**
 * Mark a reminder as triggered now, and advance its nextTriggerAt.
 * Intended for use by a scheduler/cron worker, not directly by the API.
 */
export async function markTriggered(reminderId) {
  const reminder = await Reminder.findById(reminderId)
  if (!reminder) return null

  reminder.lastTriggeredAt = new Date()
  reminder.nextTriggerAt   = reminder.enabled ? computeNextTrigger(reminder) : null
  await reminder.save()

  return reminder.toSafeObject()
}

/**
 * Find all reminders due to fire at or before `now`. Intended for use
 * by a scheduler/cron worker that polls periodically.
 */
export async function findDueReminders(now = new Date()) {
  return Reminder.find({
    enabled:       true,
    nextTriggerAt: { $lte: now },
  }).lean()
}