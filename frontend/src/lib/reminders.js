/**
 * reminders.js — Gentle Reminder System
 *
 * Manages a small set of configurable local reminders. These are UI-only
 * reminders shown inside the app (not OS/push notifications) — they appear
 * in the Notification Centre screen when the app is open.
 *
 * Storage key: sable_reminders
 * Each reminder: { id, title, description, time, enabled }
 *
 * "time" is a 24-hour HH:MM string used for display and rough matching only.
 * "enabled" toggles whether the reminder appears as active in the screen.
 *
 * The system ships with three sensible defaults (journal, check-in, reflection)
 * that are written only on first use (idempotent).
 */

const STORAGE_KEY = "sable_reminders";

// ── Defaults ──────────────────────────────────────────────────────
const DEFAULT_REMINDERS = [
  {
    id:          "default-journal",
    title:       "Journal reminder",
    description: "A few words a day adds up to something real.",
    time:        "20:00",
    enabled:     true,
  },
  {
    id:          "default-checkin",
    title:       "Daily check-in",
    description: "A quick morning mood check-in to start the day gently.",
    time:        "09:00",
    enabled:     true,
  },
  {
    id:          "default-reflection",
    title:       "Evening reflection",
    description: "How did today feel? A moment to close the day.",
    time:        "21:30",
    enabled:     true,
  },
];

// ── Storage helpers ───────────────────────────────────────────────
function readReminders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeReminders(reminders) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch {}
}

/**
 * Returns all reminders. Seeds defaults on first call if none are stored.
 */
export function getReminders() {
  const stored = readReminders();
  if (stored !== null) return stored;
  writeReminders(DEFAULT_REMINDERS);
  return DEFAULT_REMINDERS;
}

/**
 * Toggles a reminder's enabled state. Returns updated list.
 */
export function toggleReminder(id) {
  const reminders = getReminders().map((r) =>
    r.id === id ? { ...r, enabled: !r.enabled } : r
  );
  writeReminders(reminders);
  return reminders;
}

/**
 * Updates the time of a reminder. time should be "HH:MM" (24-hour).
 * Returns updated list.
 */
export function updateReminderTime(id, time) {
  const reminders = getReminders().map((r) =>
    r.id === id ? { ...r, time } : r
  );
  writeReminders(reminders);
  return reminders;
}

/**
 * Determines which reminders should be considered "due" now, based on a
 * ±30-minute window around their scheduled HH:MM time.
 * Returns an array of due reminder objects.
 */
export function getDueReminders() {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return getReminders().filter((r) => {
    if (!r.enabled) return false;
    const [hh, mm] = r.time.split(":").map(Number);
    const rMinutes = hh * 60 + (mm || 0);
    return Math.abs(nowMinutes - rMinutes) <= 30;
  });
}

/**
 * Formats a 24h "HH:MM" time string into a human-readable label.
 */
export function formatReminderTime(time) {
  try {
    const [hh, mm] = time.split(":").map(Number);
    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return time;
  }
}
