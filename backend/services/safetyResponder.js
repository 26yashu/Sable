// =============================================
// Sable — Safety Responder
// Hardcoded, non-AI crisis response layer.
// This module is the single source of truth for
// what Sable says when crisisDetected === true.
//
// CRITICAL GUARANTEES:
//  - Never calls Claude or any external API.
//  - Never gives medical, clinical, or diagnostic advice.
//  - Never attempts to assess risk itself — only routes to human help.
//  - Output is deterministic and auditable.
//  - Must run BEFORE any Claude call in the chat pipeline.
// =============================================

// ── Configurable emergency resources ──────────────────────────────────────────
// Region/config can be swapped without touching response logic.
// To localise for a non-US deployment, override via configureSafetyResources().

let EMERGENCY_RESOURCES = {
  primary: {
    name:    '988 Suicide & Crisis Lifeline',
    contact: 'Call or text 988',
    url:     'https://988lifeline.org',
    region:  'US',
  },
  textLine: {
    name:    'Crisis Text Line',
    contact: 'Text HOME to 741741',
    url:     'https://www.crisistextline.org',
    region:  'US',
  },
  international: {
    name:    'International Association for Suicide Prevention',
    contact: 'Find a crisis centre in your country',
    url:     'https://www.iasp.info/resources/Crisis_Centres/',
    region:  'INTL',
  },
  emergency: {
    name:    'Emergency services',
    contact: 'Call 911 (US) or your local emergency number',
    url:     null,
    region:  'US',
  },
}

/**
 * Override the default emergency resource set.
 * Intended for regional configuration at app startup — e.g. swapping
 * 988/911 for a non-US deployment's local equivalents.
 *
 * @param {Partial<typeof EMERGENCY_RESOURCES>} overrides
 */
export function configureSafetyResources(overrides = {}) {
  EMERGENCY_RESOURCES = {
    ...EMERGENCY_RESOURCES,
    ...overrides,
  }
}

/**
 * Read the current resource configuration (for tests/inspection).
 */
export function getSafetyResourceConfig() {
  return { ...EMERGENCY_RESOURCES }
}

// ── Tiered response copy ──────────────────────────────────────────────────────
// Tier 1 = explicit crisis language (e.g. "kill myself")
// Tier 2 = strong ideation (e.g. "can't go on", "better off without me")
// Tier 3 = indirect signals (e.g. "goodbye everyone", "too tired to continue")
//
// Each tier's message is supportive, validating, and routes to help.
// None of these messages diagnose, prescribe, or suggest treatment —
// they acknowledge the person and point to human support.

const TIER_MESSAGES = {
  1: "I'm really glad you reached out, and I want you to know that what you're feeling matters. " +
     "This sounds like something that needs more support than I can give — please reach out to a " +
     "crisis line right now. They are there for exactly this moment, and you don't have to go through " +
     "this alone.",

  2: "Something you said is staying with me, and I want to make sure you're safe. If you're having " +
     "thoughts of not wanting to be here, please know that support is available right now, and reaching " +
     "out to it is a sign of strength, not weakness.",

  3: "I noticed something in what you shared that I want to gently check in about. Are you safe right " +
     "now? If things feel heavier than you can carry alone, there is help available, and you deserve to " +
     "use it.",
}

const DEFAULT_TIER = 2 // fallback if an invalid tier is passed

// ── Resource set per tier ─────────────────────────────────────────────────────
// Higher-severity tiers surface more resources.

function buildResourceList(tier) {
  const { primary, textLine, international, emergency } = EMERGENCY_RESOURCES

  if (tier === 1) {
    return [primary, textLine, emergency, international].filter(Boolean)
  }
  if (tier === 2) {
    return [primary, textLine, international].filter(Boolean)
  }
  // tier 3 — lighter touch, still actionable
  return [primary, international].filter(Boolean)
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a safety response for a detected crisis.
 * This function is fully deterministic — it never calls an LLM.
 *
 * MUST be called and its result returned to the user BEFORE any
 * Claude API call is made, whenever crisisDetected is true.
 *
 * @param {{
 *   crisisTier?: number,        // 1 (explicit) | 2 (strong) | 3 (indirect)
 *   primaryEmotion?: string,    // optional, for logging/telemetry only
 * }} opts
 * @returns {{
 *   content: string,
 *   crisisDetected: true,
 *   crisisTier: number,
 *   resources: Array<{ name: string, contact: string, url: string | null, region: string }>,
 *   disclaimer: string,
 * }}
 */
export function generateSafetyResponse({ crisisTier } = {}) {
  const tier = [1, 2, 3].includes(crisisTier) ? crisisTier : DEFAULT_TIER

  return {
    content:        TIER_MESSAGES[tier],
    crisisDetected: true,
    crisisTier:     tier,
    resources:      buildResourceList(tier),
    disclaimer:     'This is not medical advice. Sable is not a substitute for professional care.',
  }
}

/**
 * Convenience guard for use at the top of any generation pipeline.
 * Returns the safety response if crisis is detected, otherwise null —
 * letting callers do:
 *
 *   const safety = checkSafety(emotionResult)
 *   if (safety) return safety
 *   // ...proceed to Claude call
 *
 * @param {{ crisisDetected: boolean, crisisTier: number }} emotionResult
 * @returns {ReturnType<typeof generateSafetyResponse> | null}
 */
export function checkSafety(emotionResult) {
  if (!emotionResult?.crisisDetected) return null
  return generateSafetyResponse({ crisisTier: emotionResult.crisisTier })
}