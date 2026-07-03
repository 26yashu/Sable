// =============================================
// Sable — Emotion Classifier
// Stateless, pure-function text analysis.
// No external APIs. Runs entirely in-process.
// =============================================

import {
  EMOTION_LEXICONS,
  INTENSIFIERS,
  NEGATORS,
  PHRASE_PATTERNS,
  CRISIS_SIGNALS,
} from './emotionPatterns.js'

const EMOTIONS = Object.keys(EMOTION_LEXICONS)

// ── Text normalisation ────────────────────────────────────────────────────────

function normalise(text) {
  return text
    .toLowerCase()
    // expand common contractions
    .replace(/won't/g, 'will not')
    .replace(/can't/g, 'cannot')
    .replace(/n't/g, ' not')
    .replace(/i'm/g, 'i am')
    .replace(/i've/g, 'i have')
    .replace(/i'd/g, 'i would')
    .replace(/i'll/g, 'i will')
    .replace(/it's/g, 'it is')
    .replace(/that's/g, 'that is')
    .replace(/they're/g, 'they are')
    // normalise punctuation
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Tokenise to words ─────────────────────────────────────────────────────────

function tokenise(normalisedText) {
  return normalisedText.split(/\s+/).filter(Boolean)
}

// ── Check for negation in a local window around a term position ───────────────

function isNegated(tokens, termIndex, windowSize = 3) {
  const start = Math.max(0, termIndex - windowSize)
  for (let i = start; i < termIndex; i++) {
    if (NEGATORS.includes(tokens[i])) return true
  }
  return false
}

// ── Find intensifier multiplier preceding a term ──────────────────────────────

function getIntensifierMultiplier(tokens, termIndex, windowSize = 2) {
  const start = Math.max(0, termIndex - windowSize)
  for (let i = start; i < termIndex; i++) {
    const token = tokens[i]
    for (const { terms, multiplier } of INTENSIFIERS) {
      if (terms.includes(token) || terms.some(t => token.startsWith(t))) {
        return multiplier
      }
    }
  }
  return 1.0
}

// ── Score each emotion from the lexicon ───────────────────────────────────────

function scoreLexicons(normText, tokens) {
  const scores = {}

  for (const emotion of EMOTIONS) {
    let score = 0
    const entries = EMOTION_LEXICONS[emotion]

    for (const { terms, weight } of entries) {
      for (const term of terms) {
        if (!normText.includes(term)) continue

        // Find the position of this term in the token stream
        const termTokens = term.split(' ')
        for (let i = 0; i <= tokens.length - termTokens.length; i++) {
          const slice = tokens.slice(i, i + termTokens.length).join(' ')
          if (slice === term) {
            const negated     = isNegated(tokens, i)
            const intensifier = getIntensifierMultiplier(tokens, i)
            score += negated ? -(weight * 0.5) : weight * intensifier
          }
        }
      }
    }

    scores[emotion] = Math.max(0, score) // floor at 0
  }

  return scores
}

// ── Apply phrase pattern boosts ───────────────────────────────────────────────

function applyPhraseBoosts(text, scores) {
  const boosted = { ...scores }
  for (const { pattern, emotion, boost } of PHRASE_PATTERNS) {
    if (pattern.test(text)) {
      boosted[emotion] = (boosted[emotion] || 0) + boost
    }
  }
  return boosted
}

// ── Detect crisis signals ─────────────────────────────────────────────────────

function detectCrisis(text) {
  // tier1: explicit — always flag
  for (const pattern of CRISIS_SIGNALS.tier1) {
    if (pattern.test(text)) return { detected: true, tier: 1 }
  }
  // tier2: strong ideation — flag
  for (const pattern of CRISIS_SIGNALS.tier2) {
    if (pattern.test(text)) return { detected: true, tier: 2 }
  }
  // tier3: indirect — flag but lower confidence
  for (const pattern of CRISIS_SIGNALS.tier3) {
    if (pattern.test(text)) return { detected: true, tier: 3 }
  }
  return { detected: false, tier: 0 }
}

// ── Compute confidence from score distribution ────────────────────────────────

function computeConfidence(scores, primaryScore, totalScore) {
  if (totalScore === 0) return 0.1
  const dominance = primaryScore / totalScore    // how much primary owns the signal
  const coverage  = totalScore / (EMOTIONS.length * 2) // how strong overall signal is
  const raw = (dominance * 0.6 + Math.min(coverage, 1) * 0.4)
  return Math.round(Math.min(raw, 1.0) * 100) / 100
}

// ── Normalise raw score to 1–10 intensity ─────────────────────────────────────

function scoreToIntensity(score, max) {
  if (max === 0) return 1
  const normalised = score / max
  return Math.min(10, Math.max(1, Math.round(normalised * 9) + 1))
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Classify a piece of text into primary + secondary emotions.
 *
 * @param {string} text — raw user input
 * @returns {{
 *   primaryEmotion: string,
 *   secondaryEmotion: string | null,
 *   intensity: number,        // 1–10
 *   confidence: number,       // 0–1
 *   crisisDetected: boolean,
 *   crisisTier: number,       // 0=none, 1=explicit, 2=strong, 3=indirect
 *   scores: Record<string, number>  // raw scores for all emotions
 * }}
 */
export function classifyEmotion(text) {
  if (!text?.trim()) {
    return {
      primaryEmotion:   'calm',
      secondaryEmotion: null,
      intensity:        1,
      confidence:       0.1,
      crisisDetected:   false,
      crisisTier:       0,
      scores:           {},
    }
  }

  const normText = normalise(text)
  const tokens   = tokenise(normText)

  // Crisis check first — highest priority
  const crisis = detectCrisis(normText)

  // Score lexicons then apply phrase boosts
  let scores = scoreLexicons(normText, tokens)
  scores     = applyPhraseBoosts(normText, scores)

  // Sort emotions by score descending
  const ranked = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .filter(([, v]) => v > 0)

  const totalScore   = ranked.reduce((s, [, v]) => s + v, 0)
  const maxScore     = ranked[0]?.[1] ?? 0

  const primaryEmotion   = ranked[0]?.[0] ?? 'calm'
  const secondaryEmotion = ranked[1]?.[0] ?? null

  // Don't report a secondary that's less than 25% of the primary
  const secondaryFiltered = (ranked[1]?.[1] ?? 0) >= maxScore * 0.25
    ? secondaryEmotion
    : null

  const intensity  = scoreToIntensity(maxScore, 10)
  const confidence = computeConfidence(scores, maxScore, totalScore)

  return {
    primaryEmotion,
    secondaryEmotion: secondaryFiltered,
    intensity,
    confidence,
    crisisDetected: crisis.detected,
    crisisTier:     crisis.tier,
    scores,
  }
}

/**
 * Lightweight version — just returns the primary emotion string.
 * Used in hot paths like chat where you only need the register.
 */
export function quickClassify(text) {
  const { primaryEmotion } = classifyEmotion(text)
  return primaryEmotion
}