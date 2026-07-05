/**
 * Sable API client — Backend Integration Phase 1 + AI Integration Phase 1
 *
 * Every function attempts the backend first. If the request fails
 * (network error, non-2xx, or timeout) it falls back to localStorage
 * so the app stays fully functional offline or when the server is down.
 *
 * Exports:
 *   sendMessage(payload)        → { reply, emotion, source }
 *   saveJournal(payload)        → { entry, source }
 *   getJournalHistory(anonId)   → { entries, source }
 *   saveMood(payload)           → { entry, source }
 *   getMoodSummary(anonId)      → { summary, source }
 *   generateMonthlyStory(summary) → { title, narrative, growthReflection, encouragement, source }
 */

// ── Config ─────────────────────────────────────────────────────
// VITE_API_URL is set in .env.development / .env.production.
// Falls back to localhost so the app still works without a .env file.
const BASE_URL   = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const TIMEOUT_MS = 6000;   // give the server 6 s before falling back

// localStorage keys (kept consistent with existing frontend code)
const LS_MESSAGES  = "sable_messages";
const LS_JOURNAL   = "sable_journal_entries";
const LS_MOODS     = "sable_moods";

// getAnonHeader is replaced by getAuthHeaders() from authSession.js,
// which sends both x-anon-id (when anonymous) and Authorization Bearer
// (when authenticated). Both can travel together — the backend uses whichever applies.


/**
 * Wraps fetch with an AbortController timeout so a stalled server
 * never blocks the UI indefinitely.
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Core POST helper. Returns parsed JSON on success, throws on failure.
 */
async function post(path, body) {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body:    JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Core GET helper. Returns parsed JSON on success, throws on failure.
 */
async function get(path) {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`, {
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

// ── localStorage utilities ──────────────────────────────────────

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
}

function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// ── Source tag ──────────────────────────────────────────────────
// Callers can inspect { source } to know where the data came from.
const SRC = { BACKEND: "backend", LOCAL: "local" };

import { getAuthHeaders } from "../auth/authSession";

// ── Import payload builder ──────────────────────────────────────
import { buildChatPayload } from "./chatPayload.js";

// ═══════════════════════════════════════════════════════════════
// sendMessage
// POST /chat
// Privacy-first: no user identity, no journal data, no full history.
// Payload: { message, emotion, personality, companionName, recentContext }
// Expects: { reply: string }
// Fallback: caller handles via local companionReplies engine
// ═══════════════════════════════════════════════════════════════
export async function sendMessage({ companionName, personality, communicationStyle, text, messageHistory = [] }) {
  // Build the minimal, privacy-safe payload on the client side.
  // Backend requires the user text under the key "message".
  const payload = buildChatPayload({
    message:        text,
    companionName,
    personality,
    communicationStyle,
    messageHistory,
  });

  // Ensure the top-level field the backend validates is "message"
  const body = {
    message:            payload.message,
    emotion:            payload.emotion,
    personality:        payload.personality,
    communicationStyle: payload.communicationStyle,
    companionName:      payload.companionName,
    moodContext:        payload.moodContext,
    memoryContext:      payload.memoryContext,
    memoryInfluence:    payload.memoryInfluence,  // temporal recall phrases
    recentContext:      payload.recentContext,
  };

  try {
    const data = await post("/chat", body);

    if (typeof data.reply !== "string") throw new Error("Unexpected response shape");

    return { reply: data.reply, emotion: payload.emotion, source: SRC.BACKEND };
  } catch (err) {
    console.warn("[Sable API] sendMessage fell back to local:", err.message);
    // Return the locally-detected emotion so the fallback engine can use it too
    return { reply: null, emotion: payload.emotion, source: SRC.LOCAL, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// saveJournal
// POST /journal
// Body: { anonId, text, ts }
// Expects: { entry: { id, text, ts } }
// Fallback: write to localStorage only
// ═══════════════════════════════════════════════════════════════
export async function saveJournal({ anonId, text }) {
  const ts    = new Date().toISOString();
  const local = { id: crypto.randomUUID(), text, ts };

  // Optimistic local write immediately
  const entries = lsGet(LS_JOURNAL);
  lsSet(LS_JOURNAL, [local, ...entries]);

  try {
    const data = await post("/journal", { anonId, text, ts });
    const entry = data.entry ?? local;

    // Reconcile: replace the optimistic entry with the server's canonical one
    // (server may assign a different id/ts)
    const refreshed = lsGet(LS_JOURNAL);
    const reconciled = refreshed.map((e) => (e.id === local.id ? entry : e));
    lsSet(LS_JOURNAL, reconciled);

    return { entry, source: SRC.BACKEND };
  } catch (err) {
    console.warn("[Sable API] saveJournal fell back to local:", err.message);
    return { entry: local, source: SRC.LOCAL, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// getJournalHistory
// GET /journal/history?anonId=…
// Expects: { entries: Array<{ id, text, ts }> }
// Fallback: read from localStorage
// ═══════════════════════════════════════════════════════════════
export async function getJournalHistory(anonId) {
  try {
    const data = await get(`/journal/history?anonId=${encodeURIComponent(anonId)}`);
    const entries = Array.isArray(data.entries) ? data.entries : [];

    // Merge: server is authoritative, but keep any optimistic local entries
    // that haven't synced yet (identified by being absent from server ids)
    const serverIds = new Set(entries.map((e) => e.id));
    const local     = lsGet(LS_JOURNAL);
    const unsynced  = local.filter((e) => !serverIds.has(e.id));
    const merged    = [...unsynced, ...entries].sort(
      (a, b) => new Date(b.ts) - new Date(a.ts),
    );

    lsSet(LS_JOURNAL, merged);
    return { entries: merged, source: SRC.BACKEND };
  } catch (err) {
    console.warn("[Sable API] getJournalHistory fell back to local:", err.message);
    return { entries: lsGet(LS_JOURNAL), source: SRC.LOCAL, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// saveMood
// POST /mood
// Body: { anonId, mood, ts }
// Expects: { entry: { id, mood, ts } }
// Fallback: write to localStorage only
// ═══════════════════════════════════════════════════════════════
export async function saveMood({ anonId, mood }) {
  const ts    = new Date().toISOString();
  const local = { id: crypto.randomUUID(), mood, ts };

  // Optimistic local write immediately
  const moods = lsGet(LS_MOODS);
  lsSet(LS_MOODS, [local, ...moods]);

  try {
    const data  = await post("/mood", { anonId, mood, ts });
    const entry = data.entry ?? local;

    const refreshed  = lsGet(LS_MOODS);
    const reconciled = refreshed.map((e) => (e.id === local.id ? entry : e));
    lsSet(LS_MOODS, reconciled);

    return { entry, source: SRC.BACKEND };
  } catch (err) {
    console.warn("[Sable API] saveMood fell back to local:", err.message);
    return { entry: local, source: SRC.LOCAL, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// getMoodSummary
// Route GET /mood/daily-summary does not exist on this backend.
// Always derive summary locally from localStorage — no network call.
// ═══════════════════════════════════════════════════════════════
export async function getMoodSummary(_anonId) {
  // Intentionally synchronous-style: return local data immediately,
  // wrapped in a Promise so call sites don't need to change.
  return { summary: buildLocalSummary(), source: SRC.LOCAL };
}

/** Derive a daily summary from localStorage moods (fallback logic). */
function buildLocalSummary() {
  const today  = new Date().toISOString().slice(0, 10);
  const moods  = lsGet(LS_MOODS);
  const entries = moods.filter((m) => m.ts?.slice(0, 10) === today);
  const freq   = {};
  for (const e of entries) freq[e.mood] = (freq[e.mood] || 0) + 1;
  const dominant = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { dominant, count: entries.length, entries };
}

// ═══════════════════════════════════════════════════════════════
// generateMonthlyStory
// POST /monthly-story
// Sends only the pre-aggregated monthly summary — never raw journal
// text or raw chat messages. Backend (Gemini) writes the narrative.
//
// Body: { month, dominantMood, themes, journalCount, conversationCount }
// Expects: { title, narrative, growthReflection, encouragement }
// Fallback: buildLocalMonthlyStory() — a template-based local narrative
// ═══════════════════════════════════════════════════════════════
export async function generateMonthlyStory(summary) {
  const body = {
    month:             summary.month,
    dominantMood:      summary.dominantMood,
    themes:            summary.journalThemes ?? summary.themes ?? [],
    journalCount:      summary.totalEntries ?? summary.journalCount ?? 0,
    conversationCount: summary.conversationCount ?? 0,
  };

  try {
    const data = await post("/monthly-story", body);

    if (typeof data.narrative !== "string") throw new Error("Unexpected response shape");

    return {
      title:             data.title             || `Your ${summary.month} Reflection`,
      narrative:         data.narrative,
      growthReflection:  data.growthReflection   || "",
      encouragement:     data.encouragement      || "",
      source: SRC.BACKEND,
    };
  } catch (err) {
    console.warn("[Sable API] generateMonthlyStory fell back to local:", err.message);
    return { ...buildLocalMonthlyStory(body), source: SRC.LOCAL, error: err.message };
  }
}

/**
 * Template-based local fallback narrative — used only when the backend
 * is unavailable. Compassionate tone, no diagnosis, mirrors the same
 * rules given to the AI prompt (growth-focused, mentions patterns,
 * ends with encouragement).
 */
function buildLocalMonthlyStory({ month, dominantMood, themes, journalCount, conversationCount }) {
  const moodPhrase = dominantMood
    ? `a lot of ${dominantMood} moments`
    : "a quiet, varied month";

  const themePhrase = themes.length > 0
    ? `Themes like ${themes.join(", ")} showed up more than once — worth noticing, not worrying about.`
    : "Nothing dominated the page this month — sometimes that's its own kind of balance.";

  const activityPhrase = (journalCount > 0 || conversationCount > 0)
    ? `You wrote ${journalCount} journal ${journalCount === 1 ? "entry" : "entries"} and had ${conversationCount} ${conversationCount === 1 ? "conversation" : "conversations"} this month.`
    : "There wasn't much activity logged this month, and that's alright too.";

  const narrative =
    `${month} held ${moodPhrase}. ${activityPhrase} ${themePhrase} ` +
    `None of this is a diagnosis — just a gentle mirror of what you showed up with.`;

  return {
    title: `Your ${month} Reflection`,
    narrative,
    growthReflection: journalCount > 0 || conversationCount > 0
      ? "Showing up at all — even inconsistently — is the work. You did that this month."
      : "Some months are quieter than others. Rest counts as progress too.",
    encouragement: "Whatever shape this month took, you're still here, still trying. That matters.",
  };
}
