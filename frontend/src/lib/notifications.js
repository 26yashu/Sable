/**
 * notifications.js — Notification Centre data builder
 *
 * Derives a read-only list of notifications from existing local data.
 * Does NOT write to any new key. Reads only:
 *   sable_moods, sable_journal_entries, sable_messages,
 *   sable_daily_rituals, sable_streak_records (via streaks.js)
 *
 * Notification shape:
 * {
 *   id:        string,
 *   type:      "greeting" | "reminder" | "streak" | "checkin" | "achievement",
 *   icon:      string,
 *   title:     string,
 *   body:      string,
 *   timestamp: ISO string,
 *   read:      boolean,
 * }
 *
 * Read state is persisted in sessionStorage (resets each session) so we
 * don't pollute localStorage with ephemeral UI state.
 */

import { generateDailyGreeting } from "./presence";
import { syncStreaks, getMilestone, STREAK_CATEGORIES } from "./streaks";
import { getDueReminders } from "./reminders";
import { getTodayRitual } from "./dailyRituals";

const READ_KEY = "sable_notifications_read"; // sessionStorage

// ── Read-state helpers ────────────────────────────────────────────
function getReadSet() {
  try {
    const raw = sessionStorage.getItem(READ_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

export function markNotificationRead(id) {
  try {
    const set = getReadSet();
    set.add(id);
    sessionStorage.setItem(READ_KEY, JSON.stringify([...set]));
  } catch {}
}

export function markAllRead(notifications) {
  try {
    const ids = notifications.map((n) => n.id);
    sessionStorage.setItem(READ_KEY, JSON.stringify(ids));
  } catch {}
}

// ── Builders ──────────────────────────────────────────────────────
function buildGreetingNotification() {
  const { greeting, window } = generateDailyGreeting();
  const windowIcons = { morning: "🌅", afternoon: "☀️", evening: "🌆", night: "🌙" };
  return {
    id:        `greeting-${new Date().toDateString()}`,
    type:      "greeting",
    icon:      windowIcons[window] || "✦",
    title:     "From your companion",
    body:      greeting,
    timestamp: new Date().toISOString(),
    read:      false,
  };
}

function buildStreakNotifications() {
  const { current, best } = syncStreaks();
  const notifications = [];

  for (const cat of STREAK_CATEGORIES) {
    const currentDays = current[cat.id] || 0;
    if (currentDays === 0) continue;

    const milestone = getMilestone(currentDays);
    if (!milestone) continue;

    // Only surface milestones where current equals exactly the milestone threshold
    // (not on every day above it), to avoid repetitive notifications.
    const exactThresholds = [3, 7, 14, 30];
    if (!exactThresholds.includes(currentDays)) continue;

    notifications.push({
      id:        `streak-${cat.id}-${currentDays}`,
      type:      "streak",
      icon:      milestone.emoji,
      title:     `${milestone.label} ${cat.label.toLowerCase()} streak`,
      body:      `You've kept your ${cat.label.toLowerCase()} streak going for ${currentDays} days. ${currentDays >= 7 ? "That's something real." : "Keep it up — you're building something."}`,
      timestamp: new Date().toISOString(),
      read:      false,
    });
  }

  return notifications;
}

function buildCheckInNotification() {
  const ritual = getTodayRitual();
  const bothDone = ritual.mood && ritual.reflection;
  const noneDone = !ritual.mood && !ritual.reflection;

  if (bothDone || noneDone) return null; // either complete or too early to nudge

  const isMorning = new Date().getHours() < 12;

  return {
    id:        `checkin-${new Date().toDateString()}`,
    type:      "checkin",
    icon:      "🌱",
    title:     isMorning ? "Morning check-in waiting" : "Evening reflection waiting",
    body:      isMorning
      ? "Your morning mood check-in is ready. A small moment of presence."
      : "How did today feel? Your evening reflection is here when you're ready.",
    timestamp: new Date().toISOString(),
    read:      false,
  };
}

function buildReminderNotifications() {
  const due = getDueReminders();
  return due.map((r) => ({
    id:        `reminder-${r.id}-${new Date().toDateString()}`,
    type:      "reminder",
    icon:      "🔔",
    title:     r.title,
    body:      r.description,
    timestamp: new Date().toISOString(),
    read:      false,
  }));
}

/**
 * Builds the full notification list for the current session.
 * Attaches read state from sessionStorage before returning.
 * Order: greeting → check-in → streaks → due reminders
 */
export function buildNotifications() {
  const raw = [
    buildGreetingNotification(),
    buildCheckInNotification(),
    ...buildStreakNotifications(),
    ...buildReminderNotifications(),
  ].filter(Boolean);

  const readSet = getReadSet();

  return raw.map((n) => ({ ...n, read: readSet.has(n.id) }));
}

/** Returns the count of unread notifications. */
export function getUnreadCount() {
  return buildNotifications().filter((n) => !n.read).length;
}
