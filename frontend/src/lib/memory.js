/**
 * memory.js — Companion Memory System
 *
 * Stores lightweight, non-sensitive memory fragments extracted from
 * the user's own chat messages. Each memory:
 *
 *   { id, category, content, timestamp }
 *
 * Categories:
 *   preferences        — "I like drawing"
 *   goals              — "My goal is to read more"
 *   important_events   — "I have exams next week"
 *   recurring_emotions — "I felt stressed about work"
 *   achievements       — "I finally finished my project"
 *
 * Storage key: sable_memory
 *
 * Rules enforced everywhere in this module:
 *   - Max 10 memories kept at any time (oldest dropped first)
 *   - Duplicates (near-identical content) are not re-added
 *   - No sensitive/private data is ever stored — only short,
 *     pattern-matched summaries of safe categories above
 *   - Memories are derived from short summaries, never full raw
 *     message text, and never include anything from journal entries
 */

const STORAGE_KEY = "sable_memory";
const MAX_MEMORIES = 10;

// ── Sensitive-content guard ──────────────────────────────────────
// If a message matches any of these, we never extract a memory from it,
// regardless of which extraction pattern also matched. This keeps the
// memory system from ever storing self-harm, medical, or crisis content.
const SENSITIVE_GUARD = [
  /suicide|self.?harm|kill myself|end my life|hurt myself/i,
  /address|phone number|password|social security|credit card/i,
  /diagnos(is|ed)|medication|prescri/i,
];

function isSensitive(text) {
  return SENSITIVE_GUARD.some((p) => p.test(text));
}

// ── Extraction patterns ──────────────────────────────────────────
// Each rule: a regex that captures the meaningful tail of the phrase,
// a category, and a formatter that turns the capture into a short,
// third-person memory summary (never stores the raw sentence verbatim).
const EXTRACTION_RULES = [
  {
    category: "preferences",
    pattern: /\bi (?:really )?like ([a-z0-9 ,'’-]{3,40})/i,
    format: (m) => `User likes ${m[1].trim().replace(/[.!?]+$/, "")}`,
  },
  {
    category: "preferences",
    pattern: /\bi (?:really )?love ([a-z0-9 ,'’-]{3,40})/i,
    format: (m) => `User enjoys ${m[1].trim().replace(/[.!?]+$/, "")}`,
  },
  {
    category: "goals",
    pattern: /\bmy goal is (?:to )?([a-z0-9 ,'’-]{3,50})/i,
    format: (m) => `User's goal: ${m[1].trim().replace(/[.!?]+$/, "")}`,
  },
  {
    category: "goals",
    pattern: /\bi want to ([a-z0-9 ,'’-]{3,50})/i,
    format: (m) => `User wants to ${m[1].trim().replace(/[.!?]+$/, "")}`,
  },
  {
    category: "important_events",
    pattern: /\bi have ([a-z0-9 ,'’-]{3,40}) (?:next week|tomorrow|coming up|soon|this week)/i,
    format: (m) => `User has ${m[1].trim()} coming up`,
  },
  {
    category: "important_events",
    pattern: /\b(?:exams?|interview|presentation|deadline|appointment) (?:is |are )?(?:next week|tomorrow|coming up|soon|this week)/i,
    format: (m) => `User mentioned an upcoming ${m[0].split(/\s+/)[0].toLowerCase().replace(/s$/, "")}`,
  },
  {
    category: "recurring_emotions",
    pattern: /\bi'?m worried about ([a-z0-9 ,'’-]{3,50})/i,
    format: (m) => `User has been worried about ${m[1].trim().replace(/[.!?]+$/, "")}`,
  },
  {
    category: "recurring_emotions",
    pattern: /\bi (?:felt|feel) stressed (?:about|by|over) ([a-z0-9 ,'’-]{3,50})/i,
    format: (m) => `User often feels stressed about ${m[1].trim().replace(/[.!?]+$/, "")}`,
  },
  {
    category: "recurring_emotions",
    pattern: /\bi (?:felt|feel) anxious (?:about|over) ([a-z0-9 ,'’-]{3,50})/i,
    format: (m) => `User feels anxious about ${m[1].trim().replace(/[.!?]+$/, "")}`,
  },
  {
    category: "achievements",
    pattern: /\bi (?:finally |just )?(?:finished|completed|achieved|did it[, ]?) ([a-z0-9 ,'’-]{0,50})/i,
    format: (m) => `User accomplished ${m[1].trim() || "something they were working on"}`,
  },
  {
    category: "achievements",
    pattern: /\bi'?m proud (?:of myself )?(?:for |that )?([a-z0-9 ,'’-]{0,50})/i,
    format: (m) => `User felt proud ${m[1].trim() ? "about " + m[1].trim() : "of themselves"}`,
  },
];

// ── Storage helpers ───────────────────────────────────────────────

function readMemories() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMemories(memories) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  } catch {
    // localStorage full or unavailable — memory simply won't persist this session
  }
}

/** Loose similarity check to avoid storing near-duplicate memories. */
function isDuplicate(content, existing) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const a = norm(content);
  return existing.some((m) => {
    const b = norm(m.content);
    if (a === b) return true;
    // Same category and significant word overlap counts as duplicate too
    const aWords = new Set(a.split(/\s+/).filter((w) => w.length > 3));
    const bWords = new Set(b.split(/\s+/).filter((w) => w.length > 3));
    if (aWords.size === 0 || bWords.size === 0) return false;
    const overlap = [...aWords].filter((w) => bWords.has(w)).length;
    const ratio = overlap / Math.min(aWords.size, bWords.size);
    return ratio >= 0.7;
  });
}

/**
 * Reads all stored memories, newest first.
 */
export function getMemories() {
  return readMemories().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Adds a single memory if it isn't sensitive, isn't a duplicate, and
 * isn't trivially short. Enforces the 10-memory cap by dropping the
 * oldest entry when full. Returns the updated memory list.
 */
export function addMemory(category, content) {
  const trimmed = content?.trim();
  if (!trimmed || trimmed.length < 3) return readMemories();
  if (isSensitive(trimmed)) return readMemories();

  const existing = readMemories();
  if (isDuplicate(trimmed, existing)) return existing;

  const entry = {
    id: crypto.randomUUID(),
    category,
    content: trimmed,
    timestamp: new Date().toISOString(),
  };

  let updated = [...existing, entry];

  // Enforce max cap — drop oldest first
  if (updated.length > MAX_MEMORIES) {
    updated = updated
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, MAX_MEMORIES);
  }

  writeMemories(updated);
  return updated;
}

/**
 * Deletes a single memory by id. Returns the updated list.
 */
export function deleteMemory(id) {
  const updated = readMemories().filter((m) => m.id !== id);
  writeMemories(updated);
  return updated;
}

/**
 * Scans a single user chat message for extractable memory phrases.
 * Returns an array of { category, content } candidates (usually 0 or 1).
 * Does not write to storage — caller decides whether to persist.
 */
export function extractMemoriesFromMessage(text) {
  if (!text || isSensitive(text)) return [];

  const found = [];
  for (const rule of EXTRACTION_RULES) {
    const match = text.match(rule.pattern);
    if (match) {
      const content = rule.format(match);
      if (content && content.length <= 80) {
        found.push({ category: rule.category, content });
      }
    }
  }
  return found;
}

/**
 * Convenience: extracts memories from a message and immediately
 * persists any new (non-duplicate, non-sensitive) ones.
 * Returns the updated memory list.
 */
export function extractAndStoreMemories(text) {
  const candidates = extractMemoriesFromMessage(text);
  let memories = readMemories();
  for (const { category, content } of candidates) {
    memories = addMemory(category, content);
  }
  return memories;
}

/**
 * Builds a short, privacy-safe "Companion Memory" context block
 * for inclusion in the AI request payload. Returns an array of
 * up to 10 short strings (already capped by storage), or an empty
 * array if there are no memories yet.
 *
 * Example output:
 *   ["User likes drawing", "User has exams coming up", "User often feels stressed about work"]
 */
export function buildMemoryContext() {
  const memories = getMemories();
  return memories.slice(0, MAX_MEMORIES).map((m) => m.content);
}

// ── Category metadata (shared by MemoryScreen + MemoryCard) ──────
export const MEMORY_CATEGORIES = [
  { id: "preferences",        label: "Preferences",        emoji: "💛", color: "#c4a05e" },
  { id: "goals",              label: "Goals",               emoji: "🎯", color: "#5ec4a0" },
  { id: "important_events",   label: "Important moments",   emoji: "📌", color: "#8c9fc4" },
  { id: "recurring_emotions", label: "Emotional patterns",  emoji: "🌊", color: "#7ab8a8" },
  { id: "achievements",       label: "Achievements",        emoji: "✨", color: "#d4a574" },
];

export function getCategoryMeta(id) {
  return MEMORY_CATEGORIES.find((c) => c.id === id) ?? { id, label: id, emoji: "•", color: "#5ec4a0" };
}
