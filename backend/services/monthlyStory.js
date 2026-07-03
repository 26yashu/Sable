// =============================================
// Sable — Monthly Story Data Layer
// Aggregates mood logs, chat emotion classifications,
// and journal MOOD TAGS ONLY (never raw text) for a
// calendar month. All local. No external APIs.
// =============================================

import MoodLog      from '../models/MoodLog.js'
import Message      from '../models/Message.js'
import JournalEntry from '../models/JournalEntry.js'
import { MOOD_EMOTION_MAP, EMOTION_VALENCE } from './emotionPatterns.js'
import { classifyEmotion }                   from './emotionClassifier.js'
import { generateMonthlyStory, computeGrowthScore } from './narrativeGenerator.js'
import { detectMilestones } from './emotionalMilestones.js'

const EMOTIONS = [
  'joy', 'sadness', 'anxiety', 'loneliness',
  'grief', 'anger', 'overwhelm', 'hope', 'calm', 'burnout',
]

// ── Month boundary helpers ─────────────────────────────────────────────────────

/**
 * Returns { start, end, year, month (0-indexed), label } for a month offset.
 * monthsAgo=0 → current month, 1 → last month, etc.
 */
export function getMonthBounds(monthsAgo = 0) {
  const now = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() - monthsAgo

  const start = new Date(year, month, 1, 0, 0, 0, 0)
  const end   = new Date(year, month + 1, 0, 23, 59, 59, 999) // last day of month

  return {
    start,
    end,
    year:  start.getFullYear(),
    month: start.getMonth(), // 0-indexed
    label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    daysInMonth: end.getDate(),
  }
}

function toDateStr(d) {
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}

// ── Week-of-month grouping (for the timeline) ──────────────────────────────────
// Groups days into ISO-ish weeks (Mon-Sun) that fall within the month.

function buildWeekGroups(start, end) {
  const weeks = []
  let cursor = new Date(start)

  // Walk back to the Monday on/before the 1st
  const dow = cursor.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  cursor.setDate(cursor.getDate() + mondayOffset)

  while (cursor <= end) {
    const weekStart = new Date(cursor)
    const weekEnd   = new Date(cursor)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    weeks.push({
      weekStart: new Date(weekStart),
      weekEnd:   new Date(Math.min(weekEnd.getTime(), end.getTime())),
      label:     `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      emotionScores: Object.fromEntries(EMOTIONS.map(e => [e, 0])),
      checkInCount:  0,
      dominantEmotion: null,
    })

    cursor.setDate(cursor.getDate() + 7)
  }

  return weeks
}

function weekIndexForDate(weeks, date) {
  const t = new Date(date).getTime()
  for (let i = 0; i < weeks.length; i++) {
    if (t >= weeks[i].weekStart.getTime() && t <= weeks[i].weekEnd.getTime()) return i
  }
  // Fallback — clamp to nearest
  return t < weeks[0]?.weekStart.getTime() ? 0 : weeks.length - 1
}

// ── Main aggregator ───────────────────────────────────────────────────────────

/**
 * Aggregates a full month of emotional data.
 * IMPORTANT: journal entries contribute only their `moodTag` —
 * raw `content` is never read or returned from this function.
 */
export async function aggregateMonth(ownerId, monthsAgo = 0) {
  const { start, end, label, daysInMonth, year, month } = getMonthBounds(monthsAgo)

  const [moodLogs, messages, journalEntries] = await Promise.all([
    MoodLog.find({ ownerId, createdAt: { $gte: start, $lte: end } })
      .select('mood intensity createdAt')
      .lean(),
    Message.find({ ownerId, role: 'user', createdAt: { $gte: start, $lte: end } })
      .select('content createdAt')
      .lean(),
    // Privacy: select moodTag + createdAt ONLY — content field never touched
    JournalEntry.find({ ownerId, moodTag: { $ne: null }, deletedAt: null, createdAt: { $gte: start, $lte: end } })
      .select('moodTag createdAt')
      .lean(),
  ])

  const weeks = buildWeekGroups(start, end)

  // Day-level map for milestone detection
  const dayMap = new Map() // dateStr -> { emotionScores, moodLogs: [{mood,intensity}], chatCount, journalCount }

  function getDay(dateStr) {
    if (!dayMap.has(dateStr)) {
      dayMap.set(dateStr, {
        date: dateStr,
        emotionScores: Object.fromEntries(EMOTIONS.map(e => [e, 0])),
        moodLogs: [],
        chatCount: 0,
        journalCount: 0,
      })
    }
    return dayMap.get(dateStr)
  }

  const moodDistribution = {}
  let intensitySum = 0, intensityCount = 0
  let highestIntensityEntry = null

  // ── Mood logs — weight 0.5 ──────────────────────────────────────────────────
  for (const log of moodLogs) {
    const emotion = MOOD_EMOTION_MAP[log.mood]
    const dateStr = toDateStr(log.createdAt)
    const day     = getDay(dateStr)
    const w       = (log.intensity / 10) * 0.5

    if (emotion) {
      day.emotionScores[emotion] = (day.emotionScores[emotion] || 0) + w
      const wi = weekIndexForDate(weeks, log.createdAt)
      if (weeks[wi]) weeks[wi].emotionScores[emotion] += w
    }

    day.moodLogs.push({ mood: log.mood, intensity: log.intensity })
    if (weeks[weekIndexForDate(weeks, log.createdAt)]) {
      weeks[weekIndexForDate(weeks, log.createdAt)].checkInCount++
    }

    moodDistribution[log.mood] = (moodDistribution[log.mood] || 0) + 1
    intensitySum += log.intensity
    intensityCount++

    if (!highestIntensityEntry || log.intensity > highestIntensityEntry.intensity) {
      highestIntensityEntry = { mood: log.mood, intensity: log.intensity, date: dateStr, emotion }
    }
  }

  // ── Chat messages — weight 0.3 ──────────────────────────────────────────────
  // Only emotion classification result is retained — message content is
  // discarded immediately after classification.
  const chatEmotionCounts = {}
  for (const msg of messages) {
    if (!msg.content?.trim()) continue
    const dateStr = toDateStr(msg.createdAt)
    const day      = getDay(dateStr)
    const { primaryEmotion, scores, intensity, crisisDetected } = classifyEmotion(msg.content)

    day.chatCount++
    for (const [e, s] of Object.entries(scores)) {
      if (day.emotionScores[e] !== undefined) day.emotionScores[e] += (s / 10) * 0.3
    }
    const wi = weekIndexForDate(weeks, msg.createdAt)
    if (weeks[wi]) {
      for (const [e, s] of Object.entries(scores)) {
        if (weeks[wi].emotionScores[e] !== undefined) weeks[wi].emotionScores[e] += (s / 10) * 0.3
      }
      weeks[wi].checkInCount++
    }

    chatEmotionCounts[primaryEmotion] = (chatEmotionCounts[primaryEmotion] || 0) + 1

    if (crisisDetected) {
      // Tracked only as a count for milestone purposes — never stored with content
      day.hadCrisisSignal = true
    }
  }

  // ── Journal mood tags ONLY — weight 0.2 ──────────────────────────────────────
  const journalTagCounts = {}
  for (const entry of journalEntries) {
    const emotion = MOOD_EMOTION_MAP[entry.moodTag]
    const dateStr = toDateStr(entry.createdAt)
    const day     = getDay(dateStr)

    if (emotion) {
      day.emotionScores[emotion] = (day.emotionScores[emotion] || 0) + 0.2
      const wi = weekIndexForDate(weeks, entry.createdAt)
      if (weeks[wi]) weeks[wi].emotionScores[emotion] += 0.2
    }
    day.journalCount++
    journalTagCounts[entry.moodTag] = (journalTagCounts[entry.moodTag] || 0) + 1
  }

  // ── Resolve dominant emotion per week ────────────────────────────────────────
  for (const week of weeks) {
    const ranked = Object.entries(week.emotionScores).sort(([,a],[,b]) => b-a).filter(([,v]) => v > 0)
    week.dominantEmotion = ranked[0]?.[0] ?? null
    week.dominantValence = week.dominantEmotion ? (EMOTION_VALENCE[week.dominantEmotion] ?? 'neutral') : null
  }

  // ── Month-level totals ────────────────────────────────────────────────────────
  const monthScores = Object.fromEntries(EMOTIONS.map(e => [e, 0]))
  for (const day of dayMap.values()) {
    for (const [e, s] of Object.entries(day.emotionScores)) monthScores[e] += s
  }

  const rankedMonth = Object.entries(monthScores).sort(([,a],[,b]) => b-a).filter(([,v]) => v > 0)
  const dominantEmotion = rankedMonth[0]?.[0] ?? null
  const totalScore      = rankedMonth.reduce((s,[,v]) => s+v, 0)

  const emotionBreakdown = rankedMonth.map(([emotion, score]) => ({
    emotion,
    score:      Math.round(score * 100) / 100,
    percentage: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
    valence:    EMOTION_VALENCE[emotion] ?? 'neutral',
  }))

  // ── Sorted day array (chronological) ─────────────────────────────────────────
  const days = [...dayMap.values()]
    .map(day => {
      const ranked = Object.entries(day.emotionScores).sort(([,a],[,b]) => b-a).filter(([,v]) => v > 0)
      return {
        ...day,
        dominantEmotion: ranked[0]?.[0] ?? null,
        valence: ranked[0] ? (EMOTION_VALENCE[ranked[0][0]] ?? 'neutral') : null,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const checkInCount     = moodLogs.length + messages.length + journalEntries.length
  const averageIntensity = intensityCount > 0 ? Math.round((intensitySum / intensityCount) * 10) / 10 : null
  const activeDayCount    = dayMap.size

  return {
    month: label,
    year, monthIndex: month,
    monthsAgo,
    bounds: { start: start.toISOString(), end: end.toISOString() },
    daysInMonth,
    activeDayCount,
    dominantEmotion,
    dominantValence: dominantEmotion ? (EMOTION_VALENCE[dominantEmotion] ?? 'neutral') : null,
    emotionBreakdown,
    moodDistribution,
    chatEmotionCounts,
    journalTagCounts,
    weeks,
    days,
    checkInCount,
    averageIntensity,
    highestIntensityEntry,
    hasData: checkInCount > 0,
  }
}

// =============================================
// Orchestrator — combines aggregation, narrative,
// growth score, and milestone detection into the
// final API response shape.
// =============================================

/**
 * Builds the full monthly story report for a user.
 * @param {string} ownerId
 * @param {{ monthsAgo?: number }} opts
 */
export async function buildMonthlyStory(ownerId, { monthsAgo = 0 } = {}) {
  const monthData = await aggregateMonth(ownerId, monthsAgo)

  // Fetch previous month's breakdown for "new emotion" milestone detection
  let previousBreakdown = null
  try {
    const prevData = await aggregateMonth(ownerId, monthsAgo + 1)
    previousBreakdown = prevData.emotionBreakdown
  } catch { /* non-fatal */ }

  const growthScore = computeGrowthScore(monthData)
  const { story, headline } = generateMonthlyStory(monthData, growthScore)
  const milestones = detectMilestones(monthData, previousBreakdown)

  return {
    month:           monthData.month,
    monthsAgo,
    bounds:          monthData.bounds,
    dominantEmotion: monthData.dominantEmotion,
    dominantValence: monthData.dominantValence,
    growthScore,
    story,
    headline,
    milestones,

    emotionBreakdown: monthData.emotionBreakdown,
    weeks: monthData.weeks.map(w => ({
      label:           w.label,
      dominantEmotion: w.dominantEmotion,
      dominantValence: w.dominantValence,
      checkInCount:    w.checkInCount,
    })),

    checkInCount:     monthData.checkInCount,
    activeDayCount:   monthData.activeDayCount,
    daysInMonth:      monthData.daysInMonth,
    averageIntensity: monthData.averageIntensity,

    hasData: monthData.hasData,
  }
}