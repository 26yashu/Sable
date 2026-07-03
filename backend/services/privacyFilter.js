// =============================================
// Sable — Privacy Filter
// Enforces strict data minimisation before any
// content reaches the Claude API. Journal text,
// raw notes, and user identity are never sent.
// =============================================

// ── PII pattern library ───────────────────────────────────────────────────────

const PII_PATTERNS = [
  // Email addresses
  { pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, replacement: '[email]' },
  // Phone numbers (US + international)
  { pattern: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/g, replacement: '[phone]' },
  // Social Security Numbers
  { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, replacement: '[id]' },
  // Credit card numbers (basic 13–16 digit sequences)
  { pattern: /\b(?:\d[ -]?){13,16}\b/g, replacement: '[card]' },
  // Street addresses (number + street name pattern)
  { pattern: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+){1,3}(?:St|Ave|Rd|Blvd|Dr|Ln|Way|Ct|Pl|Circle|Cir)\.?\b/gi, replacement: '[address]' },
  // US ZIP codes
  { pattern: /\b\d{5}(?:-\d{4})?\b/g, replacement: '[zip]' },
  // URLs
  { pattern: /https?:\/\/[^\s]+/g, replacement: '[url]' },
  // IP addresses
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[ip]' },
]

// Fields that must never be forwarded to the Claude API.
// Defined as a Set for O(1) lookup.
const BLOCKED_FIELDS = new Set([
  'journalContent',
  'journalText',
  'entryContent',
  'rawContent',
  'noteText',
  'moodNote',
  'note',
  'chatHistory',
  'messageHistory',
  // Identity fields
  'email',
  'hashedPassword',
  'anonId',
  'userId',
  'ownerId',
  'anonymousSessionIds',
])

// ── Text sanitisation ─────────────────────────────────────────────────────────

/**
 * Redact PII patterns from a string.
 * @param {string} text
 * @returns {string}
 */
export function redactPII(text) {
  if (typeof text !== 'string') return text
  let result = text
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

/**
 * Strip a single object of blocked fields and redact PII from string values.
 * Operates shallowly — does not recurse into nested objects (use filterPayload
 * for deep objects).
 * @param {Record<string, unknown>} obj
 * @returns {Record<string, unknown>}
 */
export function filterObject(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const clean = {}
  for (const [key, value] of Object.entries(obj)) {
    if (BLOCKED_FIELDS.has(key)) continue
    if (typeof value === 'string') {
      clean[key] = redactPII(value)
    } else {
      clean[key] = value
    }
  }
  return clean
}

/**
 * Deep-filter a context payload before it reaches the Claude API.
 * - Removes blocked fields at any depth
 * - Redacts PII from all string values
 * - Truncates long strings to prevent prompt injection via data exfiltration
 *
 * @param {unknown} payload
 * @param {{ maxStringLength?: number }} opts
 * @returns {unknown}
 */
export function filterPayload(payload, { maxStringLength = 500 } = {}) {
  if (payload === null || payload === undefined) return payload

  if (typeof payload === 'string') {
    const redacted = redactPII(payload)
    return redacted.length > maxStringLength
      ? redacted.slice(0, maxStringLength) + '…'
      : redacted
  }

  if (Array.isArray(payload)) {
    return payload.map(item => filterPayload(item, { maxStringLength }))
  }

  if (typeof payload === 'object') {
    const clean = {}
    for (const [key, value] of Object.entries(payload)) {
      if (BLOCKED_FIELDS.has(key)) continue
      clean[key] = filterPayload(value, { maxStringLength })
    }
    return clean
  }

  // Primitives (number, boolean) pass through unmodified
  return payload
}

// ── Emotion context sanitiser ─────────────────────────────────────────────────

/**
 * Produce a privacy-safe context object suitable for Claude API consumption.
 * Only emotion signals, trend data, and intensity are allowed through.
 * All identity, note text, and journal content are excluded.
 *
 * @param {{
 *   primaryEmotion?: string,
 *   secondaryEmotion?: string | null,
 *   intensity?: number,
 *   confidence?: number,
 *   weeklyTrend?: string,
 *   dominantEmotion?: string,
 *   dominantValence?: string,
 *   stabilityScore?: number | null,
 *   emotionBreakdown?: Array<{ emotion: string, percentage: number }>,
 *   crisisDetected?: boolean,
 *   crisisTier?: number,
 * }} rawContext
 * @returns {{
 *   primaryEmotion: string,
 *   secondaryEmotion: string | null,
 *   intensity: number,
 *   confidence: number,
 *   weeklyTrend: string | null,
 *   dominantEmotion: string | null,
 *   dominantValence: string | null,
 *   stabilityScore: number | null,
 *   topEmotions: Array<{ emotion: string, percentage: number }>,
 *   crisisDetected: boolean,
 *   crisisTier: number,
 * }}
 */
export function sanitiseEmotionContext(rawContext = {}) {
  return {
    primaryEmotion:   rawContext.primaryEmotion   ?? 'calm',
    secondaryEmotion: rawContext.secondaryEmotion  ?? null,
    intensity:        clampInt(rawContext.intensity, 1, 10, 5),
    confidence:       clampFloat(rawContext.confidence, 0, 1, 0.5),
    weeklyTrend:      rawContext.weeklyTrend       ?? null,
    dominantEmotion:  rawContext.dominantEmotion   ?? null,
    dominantValence:  rawContext.dominantValence   ?? null,
    stabilityScore:   rawContext.stabilityScore    ?? null,
    // Limit breakdown to top 4 for prompt conciseness
    topEmotions: Array.isArray(rawContext.emotionBreakdown)
      ? rawContext.emotionBreakdown
          .slice(0, 4)
          .map(e => ({ emotion: String(e.emotion), percentage: clampInt(e.percentage, 0, 100, 0) }))
      : [],
    crisisDetected: Boolean(rawContext.crisisDetected),
    crisisTier:     clampInt(rawContext.crisisTier, 0, 3, 0),
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clampInt(value, min, max, fallback) {
  const n = parseInt(value)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}

function clampFloat(value, min, max, fallback) {
  const n = parseFloat(value)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}