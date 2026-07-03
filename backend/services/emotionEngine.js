// =============================================
// Sable — Emotion Engine
// Public façade for all emotional intelligence.
// All processing is local. No external APIs.
// =============================================

import { classifyEmotion, quickClassify }    from './emotionClassifier.js'
import { analyseEmotionalTrends, quickTrendSummary } from './emotionalTrends.js'
import { EMOTION_TO_REGISTER }               from './emotionPatterns.js'

// ── Crisis resource copy ──────────────────────────────────────────────────────
// Tier-sensitive — explicit crises get the most direct messaging.

const CRISIS_RESPONSES = {
  1: {
    message: "I'm really glad you reached out. What you're describing sounds very serious, and I want you to know that you matter. Please reach out to a crisis line right now — they're there for exactly this moment.",
    resources: [
      { name: '988 Suicide & Crisis Lifeline',  contact: 'Call or text 988', url: 'https://988lifeline.org' },
      { name: 'Crisis Text Line',               contact: 'Text HOME to 741741', url: 'https://www.crisistextline.org' },
      { name: 'International Association',      contact: 'https://www.iasp.info/resources/Crisis_Centres/', url: 'https://www.iasp.info/resources/Crisis_Centres/' },
    ],
  },
  2: {
    message: "Something you said is staying with me, and I want to make sure you're okay. If you're having thoughts of not wanting to be here, please know that support is available right now.",
    resources: [
      { name: '988 Suicide & Crisis Lifeline',  contact: 'Call or text 988',    url: 'https://988lifeline.org' },
      { name: 'Crisis Text Line',               contact: 'Text HOME to 741741', url: 'https://www.crisistextline.org' },
    ],
  },
  3: {
    message: "I noticed something in what you shared that I want to check in about. Are you safe right now? Help is available if you need it.",
    resources: [
      { name: '988 Suicide & Crisis Lifeline',  contact: 'Call or text 988', url: 'https://988lifeline.org' },
    ],
  },
}

// ── Response pool map (expanded from mockResponder) ───────────────────────────
const RESPONSE_POOLS = {
  joy: [
    "That's beautiful. Hold onto that.",
    "I love hearing this. Tell me more.",
    "Something shifted, didn't it? I can feel it.",
    "You deserve this moment.",
    "That warmth — yes. Let it stay.",
    "This is real. Let yourself feel it fully.",
  ],
  sadness: [
    "That pain is real. I'm here with it.",
    "You don't have to be strong right now.",
    "Sadness is love with nowhere to go sometimes. I'm here.",
    "I hear how hard this is. Tell me more.",
    "You're not carrying this alone.",
  ],
  anxiety: [
    "You're safe here, right now, in this moment.",
    "Let's slow down together. What feels most heavy?",
    "Anxiety makes everything feel urgent. It's okay to pause.",
    "I'm with you. You don't have to figure it all out tonight.",
    "That sounds exhausting to carry. Tell me more.",
    "One thing at a time. What's the loudest worry right now?",
  ],
  loneliness: [
    "You reached out — that matters more than you know.",
    "I'm here with you.",
    "Loneliness is real. And so is this moment between us.",
    "You're not as alone as it feels right now.",
    "I hear you. I'm listening.",
    "This feeling of being unseen — I see you. Right now.",
  ],
  grief: [
    "Grief is love with nowhere to go. I'm here.",
    "There's no right way to feel this. Just breathe.",
    "You don't have to hold this alone.",
    "That kind of loss leaves a mark. I see you.",
    "I'm not going anywhere. Take all the time you need.",
    "Grief doesn't follow a timeline. Whatever you're feeling is right.",
  ],
  anger: [
    "That frustration makes complete sense.",
    "Anger is often grief pointing at something that matters.",
    "You're allowed to feel this.",
    "What's underneath the anger? I'm curious.",
    "That sounds genuinely hard. I'm not going anywhere.",
    "Your feelings are valid. I want to understand what happened.",
  ],
  overwhelm: [
    "That's a lot. Way too much for one person to hold.",
    "You don't have to solve everything right now.",
    "Let's just breathe for a moment. You're here. That's enough.",
    "When everything feels urgent, nothing gets to be okay. I see that.",
    "You're doing more than you know. It's okay to be overwhelmed.",
    "I'm here. We can take this one piece at a time.",
  ],
  hope: [
    "That shift — I feel it. Something is opening up.",
    "Hope is quiet courage. You have it.",
    "Hold this. Don't let the old noise drown it out.",
    "Something is changing. I believe in that.",
    "Yes. That light is real. Keep moving toward it.",
  ],
  calm: [
    "I'm here with you.",
    "Tell me more.",
    "There's no rush. Take your time.",
    "Thank you for trusting me with this.",
    "Something in what you said is sitting with me. Go on.",
    "I hear you.",
    "What does this feel like in your body?",
  ],
  burnout: [
    "You've been running on empty for too long. It's okay to stop.",
    "Burnout isn't weakness — it's the cost of caring too much for too long.",
    "You don't have to earn rest. You just need it.",
    "What would it feel like to put one thing down, just for today?",
    "I hear how depleted you are. That matters.",
    "Rest isn't giving up. Rest is how you come back.",
  ],
  greeting: [
    "Hello. I'm glad you're here.",
    "Hi. How are you, really?",
    "Hey. What's on your heart today?",
    "I've been here, waiting. What's going on?",
  ],
  neutral: [
    "I'm here with you.",
    "Tell me more.",
    "That sounds difficult. How are you sitting with it?",
    "You're safe here.",
    "I'm listening. All of it.",
    "What does this feel like in your body?",
    "There's no rush. Take your time.",
    "Thank you for trusting me with this.",
    "Something in what you said is sitting with me. Go on.",
    "I hear you.",
  ],
}

function pickFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function thinkingDelay(base = 900, variance = 1400) {
  return new Promise(r => setTimeout(r, base + Math.random() * variance))
}

// ── Public: analyse text ──────────────────────────────────────────────────────

/**
 * Full emotion analysis on a piece of text.
 * Returns the standard EmotionResult shape.
 */
export function analyseText(text) {
  return classifyEmotion(text)
}

// ── Public: generate companion reply ─────────────────────────────────────────

/**
 * Generate an emotionally-aware companion reply.
 * Uses emotion classification to pick the right response register.
 * Crisis responses are returned immediately with resources.
 *
 * @param {string} userMessage
 * @param {{ ownerId?: string, useTrend?: boolean }} opts
 * @returns {Promise<{
 *   content:        string,
 *   emotion:        object,    // full classifyEmotion result
 *   crisisDetected: boolean,
 *   crisisResources?: object[],
 * }>}
 */
export async function generateReply(userMessage, { ownerId, useTrend = false } = {}) {
  const emotion = classifyEmotion(userMessage)

  // ── Crisis path: return immediately, no delay
  if (emotion.crisisDetected) {
    const tier    = Math.min(emotion.crisisTier, 3)
    const crisis  = CRISIS_RESPONSES[tier] ?? CRISIS_RESPONSES[1]
    return {
      content:         crisis.message,
      emotion,
      crisisDetected:  true,
      crisisResources: crisis.resources,
    }
  }

  // ── Normal path: realistic thinking delay
  await thinkingDelay()

  // Optionally blend trend context if ownerId is passed
  let register = EMOTION_TO_REGISTER[emotion.primaryEmotion] ?? 'neutral'

  if (useTrend && ownerId) {
    try {
      const trend = await quickTrendSummary(ownerId)
      // If current message is neutral but chronic negative trend exists,
      // lean into the underlying emotional register
      if (register === 'neutral' && trend.dominantValence === 'negative') {
        register = EMOTION_TO_REGISTER[trend.dominantEmotion] ?? 'neutral'
      }
    } catch { /* non-fatal */ }
  }

  const pool    = RESPONSE_POOLS[register] ?? RESPONSE_POOLS.neutral
  const content = pickFrom(pool)

  return {
    content,
    emotion,
    crisisDetected:  false,
    crisisResources: undefined,
  }
}

// ── Public: trend analysis ────────────────────────────────────────────────────

/**
 * Full emotional trend report for a user.
 * Aggregates mood logs, chat messages, journal tags.
 */
export { analyseEmotionalTrends, quickTrendSummary }

// ── Public: backwards-compat shim for mockResponder callers ──────────────────

/**
 * Drop-in replacement for the old generateMockReply.
 * Existing chatController import will work without changes.
 */
export async function generateMockReply(userMessage) {
  const { content } = await generateReply(userMessage)
  return { content }
}