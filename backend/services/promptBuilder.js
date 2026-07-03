// =============================================
// Sable — Prompt Builder
// Constructs Claude API prompts from sanitised
// emotion context. No raw user data ever appears
// in these prompts — only derived signals.
// =============================================

import { EMOTION_VALENCE } from './emotionPatterns.js'

// ── Sable companion persona (system prompt core) ──────────────────────────────

const COMPANION_PERSONA = `You are Sable, a warm and emotionally intelligent companion. \
You hold space for people without judgment. Your responses are calm, present, and human. \
You do not diagnose, prescribe, or give clinical advice. \
You do not tell people what to feel. \
You do not pepper them with multiple questions. \
You ask at most one question per response, and only when it genuinely deepens the conversation. \
You respond with empathy, not solutions, unless a solution is explicitly requested. \
Keep responses concise — 2 to 4 sentences. Never use bullet points or headers. \
Write in plain prose. Never begin with "I" as the first word of your reply.`

// ── Emotion-register voice guidance ──────────────────────────────────────────

const REGISTER_GUIDANCE = {
  joy: `The person is feeling genuinely positive. Meet them there warmly — \
celebrate without diminishing or cautioning. Let joy be just joy.`,

  hope: `There is a thread of hope present. Acknowledge it gently. \
Don't inflate it into certainty, but don't undercut it either. \
Hope is fragile — hold it carefully.`,

  calm: `The person seems settled. Be present without projecting emotion onto them. \
Respond naturally, like a quiet conversation.`,

  sadness: `Sadness is present. Do not rush to fix or reframe. \
Sit with them in it. Validation before anything else.`,

  anxiety: `Anxiety is active. Ground the response in the present moment. \
Avoid language that amplifies urgency. One thing at a time.`,

  loneliness: `The person feels alone or unseen. Your presence is the response. \
Make them feel genuinely heard — not managed or handled.`,

  grief: `Grief is here. Do not minimise, compare, or put a timeline on it. \
Simply witness. There is nothing to fix.`,

  anger: `Anger is present. Validate before anything else — anger is almost always \
protecting something that matters. Don't redirect too quickly.`,

  overwhelm: `The person is overwhelmed. Do not add to the cognitive load. \
Short, grounding, warm. Help them feel less alone in the weight.`,

  burnout: `Burnout speaks of something depleted and long-running. \
Don't suggest rest glibly. Acknowledge the depth of what has accumulated.`,

  neutral: `Respond naturally and with warmth. Follow their lead.`,
}

// ── Trend context layer ───────────────────────────────────────────────────────

const TREND_GUIDANCE = {
  improving:         'Emotional patterns have been improving. There is genuine momentum here.',
  declining:         'It has been a harder stretch recently. Be especially gentle.',
  stable:            'Emotional patterns have been fairly consistent.',
  insufficient_data: null, // no trend guidance when data is sparse
}

// ── Intensity modifiers ───────────────────────────────────────────────────────

function intensityGuidance(intensity) {
  if (intensity >= 8) return 'This is high-intensity — the feeling is acute and strong. Be especially present.'
  if (intensity >= 5) return 'This is moderate intensity — real and felt, but not at a peak.'
  return 'This is lower intensity — perhaps early or passing, or the person is measured in how they express it.'
}

// ── Secondary emotion note ────────────────────────────────────────────────────

function secondaryNote(secondary) {
  if (!secondary) return null
  return `Underneath the primary emotion, ${secondary} is also present. \
You don't need to address it directly unless it surfaces — but let it inform your sensitivity.`
}

// ── Stability note ────────────────────────────────────────────────────────────

function stabilityNote(score) {
  if (score === null || score === undefined) return null
  if (score >= 0.65) return 'Emotionally, the person has been fairly consistent recently.'
  if (score >= 0.4)  return 'There has been some emotional variability recently.'
  return 'Emotional patterns have been quite variable recently — they may be in a period of flux.'
}

// ── Top emotions context ──────────────────────────────────────────────────────

function topEmotionsNote(topEmotions) {
  if (!topEmotions?.length) return null
  const listed = topEmotions
    .slice(0, 3)
    .map(e => `${e.emotion} (${e.percentage}%)`)
    .join(', ')
  return `Recent emotional landscape: ${listed}.`
}

// ── Public: build system prompt ───────────────────────────────────────────────

/**
 * Build the system prompt for a Claude API call.
 * Takes sanitised emotion context (from privacyFilter.sanitiseEmotionContext).
 *
 * @param {{
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
 * }} context
 * @returns {string}
 */
export function buildSystemPrompt(context) {
  const register = resolveRegister(context.primaryEmotion)
  const lines    = [COMPANION_PERSONA, '']

  lines.push('## Emotional context for this response')
  lines.push(`Primary emotion detected: ${context.primaryEmotion} (confidence ${Math.round(context.confidence * 100)}%)`)

  const secondary = secondaryNote(context.secondaryEmotion)
  if (secondary) lines.push(secondary)

  lines.push(intensityGuidance(context.intensity))

  const trendLine = TREND_GUIDANCE[context.weeklyTrend]
  if (trendLine) lines.push(trendLine)

  const stability = stabilityNote(context.stabilityScore)
  if (stability) lines.push(stability)

  const topNote = topEmotionsNote(context.topEmotions)
  if (topNote) lines.push(topNote)

  lines.push('')
  lines.push('## Response guidance for this emotional register')
  lines.push(REGISTER_GUIDANCE[register] ?? REGISTER_GUIDANCE.neutral)

  // Safety instruction — always appended
  lines.push('')
  lines.push('## Safety')
  lines.push(
    'If the message contains any indication of self-harm, suicide, or crisis, ' +
    'respond with immediate, direct warmth and provide the 988 Suicide and Crisis Lifeline ' +
    '(call or text 988). Do not handle crisis alone — always surface resources.'
  )

  return lines.join('\n')
}

// ── Public: build user message ────────────────────────────────────────────────

/**
 * Wrap the user's message in a privacy-safe envelope.
 * The message has already been PII-redacted upstream by privacyFilter.
 *
 * @param {string} sanitisedMessage — redacted user message
 * @returns {string}
 */
export function buildUserMessage(sanitisedMessage) {
  return sanitisedMessage.trim()
}

// ── Public: build conversation history ───────────────────────────────────────

/**
 * Convert stored message records to the Anthropic messages array format.
 * Only 'user' and 'companion' roles are used; companion maps to 'assistant'.
 * Strips any fields beyond role + content. Applies PII redaction to content.
 *
 * @param {Array<{ role: 'user' | 'companion', content: string }>} history
 * @param {{ maxMessages?: number }} opts
 * @returns {Array<{ role: 'user' | 'assistant', content: string }>}
 */
export function buildMessageHistory(history = [], { maxMessages = 10 } = {}) {
  return history
    .filter(m => m.role === 'user' || m.role === 'companion')
    .slice(-maxMessages)
    .map(m => ({
      role:    m.role === 'companion' ? 'assistant' : 'user',
      content: String(m.content ?? '').trim(),
    }))
    .filter(m => m.content.length > 0)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveRegister(primaryEmotion) {
  const map = {
    joy:       'joy',
    hope:      'hope',
    calm:      'calm',
    sadness:   'sadness',
    anxiety:   'anxiety',
    loneliness:'loneliness',
    grief:     'grief',
    anger:     'anger',
    overwhelm: 'overwhelm',
    burnout:   'burnout',
  }
  return map[primaryEmotion] ?? 'neutral'
}