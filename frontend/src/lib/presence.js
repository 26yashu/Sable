/**
 * presence.js — Daily Companion Presence
 *
 * Generates contextual, time-aware companion greetings. Reads only:
 *   sable_moods             (latest mood label — no raw text)
 *   sable_memory            (first memory content — no raw text)
 *
 * Never writes to any key. Never calls the backend. Pure local logic.
 *
 * Returns: { greeting: string, window: "morning"|"afternoon"|"evening"|"night" }
 */

import { MOODS } from "../components/MoodSelector";

// ── Time window ───────────────────────────────────────────────────
export function getTimeWindow() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}

// ── Recent mood ───────────────────────────────────────────────────
function getLatestMood() {
  try {
    const raw   = localStorage.getItem("sable_moods");
    const moods = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(moods) || moods.length === 0) return null;
    // moods stored newest-first
    const latest = moods[0];
    const meta   = MOODS.find((m) => m.id === latest.mood);
    return meta ? { id: latest.mood, label: meta.label.toLowerCase(), emoji: meta.emoji } : null;
  } catch {
    return null;
  }
}

// ── First memory snippet ──────────────────────────────────────────
function getFirstMemory() {
  try {
    const raw      = localStorage.getItem("sable_memory");
    const memories = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(memories) || memories.length === 0) return null;
    // memories stored newest-first after sort; pick first
    const sorted = [...memories].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    return sorted[0].content || null;
  } catch {
    return null;
  }
}

// ── Greeting pools ────────────────────────────────────────────────
const GREETINGS = {
  morning: [
    "Good morning 🌱 How are you feeling as the day begins?",
    "Morning. Take a breath — how are you doing today?",
    "Good morning. I'm here. How did you wake up feeling?",
    "A new day. How are you stepping into it?",
    "Good morning 🌿 What's on your heart this morning?",
  ],
  afternoon: [
    "You've made it through part of the day. How are things going?",
    "Checking in — how's the afternoon treating you?",
    "Midday can be a lot. How are you holding up?",
    "How's today been feeling so far?",
    "Taking a quiet moment — how are you doing right now?",
  ],
  evening: [
    "Evening 🌙 How did today feel for you?",
    "The day is winding down. How are you doing?",
    "Good evening. Take a moment — how are you feeling tonight?",
    "Evening. I'm here. What's sitting with you right now?",
    "How did the rest of your day go?",
  ],
  night: [
    "Still here with you. How are you feeling tonight?",
    "It's late. How are you doing?",
    "Night time can feel different. How are you?",
    "Before the day ends — how are you feeling?",
    "I'm here. What's on your mind tonight?",
  ],
};

// Mood-aware additions that append to the base greeting
const MOOD_NOTES = {
  sad:        " I noticed you've been feeling low recently. I'm right here.",
  anxious:    " I know things have felt anxious lately. No rush — just breathe.",
  tired:      " You've mentioned feeling tired. Be gentle with yourself today.",
  stressed:   " Things have felt stressful. You don't have to carry it alone.",
  frustrated: " I know you've been frustrated. It's okay — I'm listening.",
  happy:      " It's lovely to hear things have been going well.",
  calm:       " You've seemed calm lately. I hope today holds more of that.",
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates a contextual greeting string and returns the current time window.
 *
 * @param {string} [companionName] — companion's name (e.g. "Luna"). Falls back
 *        to the companion name stored in sable_companion_profile, or omits it.
 * @returns {{ greeting: string, window: string }}
 */
export function generateDailyGreeting(companionName) {
  const window = getTimeWindow();
  const mood   = getLatestMood();

  // Resolve companion name from param or stored profile
  let name = companionName;
  if (!name) {
    try {
      const raw = localStorage.getItem("sable_companion_name");
      name = raw || "";
    } catch {}
  }

  let greeting = pickRandom(GREETINGS[window]);

  // Append mood-aware note if a recent mood exists
  if (mood && MOOD_NOTES[mood.id]) {
    greeting += MOOD_NOTES[mood.id];
  }

  return { greeting, window };
}

/**
 * Returns true if a fresh daily greeting should be shown (i.e. one hasn't
 * been shown yet today). Uses a lightweight date-string cache in sessionStorage
 * so the greeting shows once per browser session, not on every screen switch.
 */
export function shouldShowGreeting() {
  try {
    const last = sessionStorage.getItem("sable_greeting_shown");
    const today = new Date().toDateString();
    return last !== today;
  } catch {
    return true;
  }
}

export function markGreetingShown() {
  try {
    sessionStorage.setItem("sable_greeting_shown", new Date().toDateString());
  } catch {}
}
