/**
 * monthlyStory.js — Monthly Story Foundation (data structure only)
 *
 * This module ONLY builds a local data structure summarizing the
 * current calendar month's activity. It does NOT generate any AI
 * story, does NOT call the backend, and does NOT modify any
 * existing persistence. It reads three existing localStorage keys:
 *
 *   sable_moods             — mood check-ins
 *   sable_journal_entries   — journal entries
 *   sable_messages          — chat messages
 *
 * Output shape:
 * {
 *   month:            "June 2026",
 *   dominantMood:     "calm" | null,
 *   journalThemes:    ["work pressure", "stress"],
 *   totalEntries:     12,
 *   conversationCount: 8
 * }
 *
 * "conversationCount" is the number of user-authored chat messages
 * sent this month — a lightweight proxy for "conversations had",
 * since the existing chat persistence doesn't track conversation
 * boundaries. No AI story text is generated here — Phase 2 work.
 */

// ── Theme classifier (same lightweight pattern as chatPayload.js) ──
const THEME_RULES = [
  { theme: "work pressure", patterns: [/work|job|boss|deadline|meeting|office|career/i] },
  { theme: "relationships", patterns: [/friend|family|partner|relationship|love|lonely/i] },
  { theme: "health",        patterns: [/health|sick|body|sleep|pain|tired|exhausted/i] },
  { theme: "self-worth",    patterns: [/worth|enough|failure|success|proud|shame|blame/i] },
  { theme: "change",        patterns: [/change|moving|transition|new|different|future/i] },
  { theme: "grief",         patterns: [/loss|grief|miss|gone|death|died|mourn/i] },
  { theme: "gratitude",     patterns: [/grateful|thankful|lucky|blessed|appreciate/i] },
  { theme: "stress",        patterns: [/stress|overwhelm|anxiety|pressure|worry/i] },
];

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function isThisMonth(iso) {
  const now  = new Date();
  const then = new Date(iso);
  return then.getFullYear() === now.getFullYear() && then.getMonth() === now.getMonth();
}

function getMonthLabel() {
  return new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Derives up to 3 theme labels from a set of journal entries. */
function extractThemes(entries) {
  const counts = {};
  for (const entry of entries) {
    const text = entry.text || "";
    for (const { theme, patterns } of THEME_RULES) {
      if (patterns.some((p) => p.test(text))) {
        counts[theme] = (counts[theme] || 0) + 1;
      }
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme]) => theme);
}

/** Finds the most frequent mood id among a set of mood entries. */
function getDominantMood(moodEntries) {
  if (moodEntries.length === 0) return null;
  const freq = {};
  for (const m of moodEntries) freq[m.mood] = (freq[m.mood] || 0) + 1;
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Builds the Monthly Story data structure for the current calendar month.
 * Pure local computation — no network, no AI, no side effects.
 *
 * @returns {{
 *   month: string,
 *   dominantMood: string|null,
 *   journalThemes: string[],
 *   totalEntries: number,
 *   conversationCount: number
 * }}
 */
export function buildMonthlyStoryData() {
  const moods    = readJSON("sable_moods");
  const journals = readJSON("sable_journal_entries");
  const messages = readJSON("sable_messages");

  const monthMoods    = moods.filter((m) => isThisMonth(m.ts));
  const monthJournals = journals.filter((j) => isThisMonth(j.ts));
  const monthMessages = messages.filter((m) => m.ts && isThisMonth(m.ts) && m.role === "user");

  return {
    month:             getMonthLabel(),
    dominantMood:      getDominantMood(monthMoods),
    journalThemes:     extractThemes(monthJournals),
    totalEntries:      monthJournals.length,
    conversationCount: monthMessages.length,
  };
}
