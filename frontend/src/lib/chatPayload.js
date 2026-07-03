/**
 * chatPayload.js — Privacy-first AI payload builder
 *
 * Payload shape sent to backend:
 * {
 *   message:            string,       // current user message
 *   emotion:            string|null,  // locally detected emotion label
 *   personality:        string,       // companion personality id
 *   communicationStyle: string,       // companion communication style
 *   companionName:      string,       // companion name (for tone only)
 *   moodContext:        object|null,  // { currentMood, recentThemes[] } — labels only, no raw text
 *   memoryContext:      string[],     // up to 10 short companion-memory summaries — no raw chat text
 *   recentContext:      Array,        // last ≤10 turns, role+text only
 * }
 *
 * Never sent: user identity, display name, journal text, full history, private data.
 */

import { buildMemoryContext } from "./memory.js";

// ── Emotion detector ───────────────────────────────────────────
const EMOTION_RULES = [
  { emotion: "anxious",    patterns: [/anxious|anxiety|panic|nervous|worry|worried|overwhelm/i] },
  { emotion: "stressed",   patterns: [/stress(ed|ful)?|too much|can't cope|falling apart/i] },
  { emotion: "sad",        patterns: [/sad|depressed|depress(ion)?|down|low|unhappy|empty|hollow/i] },
  { emotion: "lonely",     patterns: [/lonely|alone|isolated|no one|nobody/i] },
  { emotion: "tired",      patterns: [/tired|exhausted|burned? ?out|drained|no energy/i] },
  { emotion: "angry",      patterns: [/angry|furious|mad|rage|frustrat(ed|ing)|resentful/i] },
  { emotion: "happy",      patterns: [/happy|joy(ful)?|excited|great|wonderful|good news/i] },
  { emotion: "grateful",   patterns: [/thank(ful|s| you)|grateful|appreciate/i] },
  { emotion: "hopeful",    patterns: [/hope|hopeful|looking forward|optimistic|better/i] },
  { emotion: "lost",       patterns: [/lost|confused|don'?t know|no direction|purpose/i] },
  { emotion: "grief",      patterns: [/grief|griev(ing|ed)|loss|lost (a|my|him|her|them)|died|death/i] },
  { emotion: "shame",      patterns: [/shame|ashamed|embarrass(ed|ing)|humiliat(ed|ing)|worthless/i] },
];

// ── Theme classifier (applied to journal text in aggregate only) ──
// Each entry is never sent; only the theme label is derived from it.
const THEME_RULES = [
  { theme: "work pressure",   patterns: [/work|job|boss|deadline|meeting|office|career/i] },
  { theme: "relationships",   patterns: [/friend|family|partner|relationship|love|lonely/i] },
  { theme: "health",          patterns: [/health|sick|body|sleep|pain|tired|exhausted/i] },
  { theme: "self-worth",      patterns: [/worth|enough|failure|success|proud|shame|blame/i] },
  { theme: "change",          patterns: [/change|moving|transition|new|different|future/i] },
  { theme: "grief",           patterns: [/loss|grief|miss|gone|death|died|mourn/i] },
  { theme: "gratitude",       patterns: [/grateful|thankful|lucky|blessed|appreciate/i] },
  { theme: "stress",          patterns: [/stress|overwhelm|anxiety|pressure|worry/i] },
];

/**
 * Detects the primary emotional signal in a piece of text.
 * Returns a lowercase emotion label, or null.
 */
export function detectEmotion(text) {
  const t = text.trim();
  for (const { emotion, patterns } of EMOTION_RULES) {
    if (patterns.some((p) => p.test(t))) return emotion;
  }
  return null;
}

/**
 * Derives up to 3 theme labels from journal entry text.
 * Only labels are returned — raw journal content never leaves this function.
 */
function extractThemes(journalEntries = []) {
  const themeCounts = {};

  for (const entry of journalEntries) {
    const text = entry.text || "";
    for (const { theme, patterns } of THEME_RULES) {
      if (patterns.some((p) => p.test(text))) {
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      }
    }
  }

  return Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme]) => theme);
}

/**
 * Builds a minimal, privacy-safe mood context object from localStorage.
 * Reads sable_moods and sable_journal_entries locally.
 * Returns { currentMood: string|null, recentThemes: string[] } — labels only.
 *
 * Example output:
 *   { currentMood: "sad", recentThemes: ["work pressure", "stress"] }
 *
 * This object is safe to include in AI requests — no raw personal content.
 */
export function buildMoodContext() {
  try {
    // ── Latest mood ──────────────────────────────────────────────
    const moodsRaw    = localStorage.getItem("sable_moods");
    const moods       = moodsRaw ? JSON.parse(moodsRaw) : [];
    const currentMood = moods.length > 0 ? moods[0].mood : null;

    // ── Recent journal themes (last 5 entries, no raw text) ──────
    const journalRaw = localStorage.getItem("sable_journal_entries");
    const journals   = journalRaw ? JSON.parse(journalRaw) : [];
    const recent5    = journals.slice(0, 5);
    const recentThemes = extractThemes(recent5);

    if (!currentMood && recentThemes.length === 0) return null;

    return { currentMood, recentThemes };
  } catch {
    return null;
  }
}

/**
 * Loads the companion profile from localStorage.
 * Returns the full profile shape with safe defaults.
 */
export function loadCompanionProfile() {
  try {
    const raw = localStorage.getItem("sable_companion_profile");
    if (!raw) return { personality: "gentle", communicationStyle: "warm and calm", memory: [] };
    const p = JSON.parse(raw);
    return {
      personality:        p.personality        || "gentle",
      communicationStyle: p.communicationStyle || "warm and calm",
      memory:             Array.isArray(p.memory) ? p.memory : [],
    };
  } catch {
    return { personality: "gentle", communicationStyle: "warm and calm", memory: [] };
  }
}

/**
 * Builds the complete, minimal, privacy-safe payload for POST /chat.
 *
 * @param {object} params
 * @param {string}   params.message        – the current user message
 * @param {string}   params.companionName  – companion's name (for tone only)
 * @param {string}   params.personality    – personality id
 * @param {string}   params.communicationStyle – e.g. "warm and calm"
 * @param {Array}    params.messageHistory – full local message array
 *
 * @returns {object} payload
 */
export function buildChatPayload({
  message,
  companionName,
  personality,
  communicationStyle,
  messageHistory = [],
}) {
  const emotion       = detectEmotion(message);
  const moodContext   = buildMoodContext();
  const memoryContext = buildMemoryContext(); // up to 10 short summaries, no raw text

  // Last 10 turns, role+text only — no ids, timestamps, or metadata
  const recentContext = messageHistory
    .slice(-10)
    .map(({ role, text }) => ({ role, text }));

  return {
    message,
    emotion,
    personality:        personality        || "gentle",
    communicationStyle: communicationStyle || "warm and calm",
    companionName:      companionName      || "Sable",
    moodContext,      // { currentMood, recentThemes } or null — labels only, no raw text
    memoryContext,    // string[] — up to 10 short companion-memory summaries
    recentContext,
  };
}

// ── Personality descriptors (documents backend system prompt contract) ──
export const PERSONALITY_DESCRIPTORS = {
  gentle:     "Warm, patient, and softly encouraging. Never rushes. Creates safety.",
  cheerful:   "Uplifting and warm. Celebrates small wins. Keeps energy gentle, not loud.",
  thoughtful: "Reflective and curious. Asks one deep question at a time. Explores beneath the surface.",
  calm:       "Still and grounding. Uses space and silence. Never over-explains.",
  motivating: "Energising and forward-looking. Acknowledges pain then gently points toward strength.",
};

// ── Communication style presets ────────────────────────────────
export const COMMUNICATION_STYLES = [
  { id: "warm and calm",      label: "Warm & Calm",       desc: "Gentle, unhurried, creates safety" },
  { id: "curious and deep",   label: "Curious & Deep",    desc: "Asks thoughtful questions, explores" },
  { id: "uplifting",          label: "Uplifting",         desc: "Focuses on strength and forward motion" },
  { id: "quiet and steady",   label: "Quiet & Steady",    desc: "Minimal words, steady presence" },
  { id: "direct and honest",  label: "Direct & Honest",   desc: "Clear, grounded, no-nonsense warmth" },
];
