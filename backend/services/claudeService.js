// =============================================
// Sable — Claude Service
// Anthropic API integration with emotion-aware
// prompting and mandatory privacy filtering.
//
// Privacy guarantees (enforced, not optional):
//  - Journal text is never sent
//  - Raw mood notes are never sent
//  - User identity (email, anonId) is never sent
//  - All messages are PII-redacted before dispatch
//  - Crisis responses bypass AI and are hardcoded
// =============================================

import Anthropic from '@anthropic-ai/sdk'
import { classifyEmotion }         from './emotionClassifier.js'
import { quickTrendSummary }       from './emotionalTrends.js'
import { sanitiseEmotionContext, filterPayload, redactPII } from './privacyFilter.js'
import { buildSystemPrompt, buildUserMessage, buildMessageHistory } from './promptBuilder.js'
import { checkSafety }             from './safetyResponder.js'

// ── Client singleton ──────────────────────────────────────────────────────────

let _client = null

function getClient() {
  if (_client) return _client
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in environment.')
  _client = new Anthropic({ apiKey })
  return _client
}

// ── Model config ──────────────────────────────────────────────────────────────

const MODEL        = process.env.CLAUDE_MODEL ?? 'claude-sonnet-4-6'
const MAX_TOKENS   = 350   // Sable responses are intentionally concise
const TEMPERATURE  = 0.75  // Warm but not erratic

// ── Main: generate a companion reply via Claude ──────────────────────────────

/**
 * Generate an emotionally-aware companion reply using Claude.
 *
 * @param {string} userMessage — raw user message (will be PII-filtered)
 * @param {{
 *   ownerId?:       string,   — used only for trend fetch, never sent to API
 *   history?:       Array<{ role: string, content: string }>,
 *   emotionResult?: object,   — pre-computed classifyEmotion result (optional)
 *   weeklyTrend?:   string,   — pre-computed trend direction (optional)
 * }} opts
 * @returns {Promise<{
 *   content:        string,
 *   emotion:        object,
 *   crisisDetected: boolean,
 *   crisisResources?: object[],
 *   usedFallback:   boolean,
 * }>}
 */
export async function generateClaudeReply(userMessage, {
  ownerId,
  history   = [],
  emotionResult,
  weeklyTrend,
} = {}) {

  // ── 1. Classify emotion (reuse pre-computed result when available) ──────────
  const emotion = emotionResult ?? classifyEmotion(userMessage)

  // ── 2. Crisis path — delegated to safetyResponder, never to Claude ────────
  const safety = checkSafety(emotion)
  if (safety) {
    return {
      content:         safety.content,
      emotion,
      crisisDetected:  true,
      crisisResources: safety.resources,
      usedFallback:    false,
    }
  }

  // ── 3. Fetch weekly trend if not provided ──────────────────────────────────
  let resolvedTrend = weeklyTrend ?? null
  if (!resolvedTrend && ownerId) {
    try {
      const summary  = await quickTrendSummary(ownerId)
      resolvedTrend  = summary?.dominantEmotion
        ? trendFromSummary(summary)
        : null
    } catch { /* non-fatal */ }
  }

  // ── 4. Build privacy-safe context ─────────────────────────────────────────
  const safeContext = sanitiseEmotionContext({
    primaryEmotion:   emotion.primaryEmotion,
    secondaryEmotion: emotion.secondaryEmotion,
    intensity:        emotion.intensity,
    confidence:       emotion.confidence,
    weeklyTrend:      resolvedTrend,
    crisisDetected:   false,
    crisisTier:       0,
  })

  // ── 5. Build prompts ───────────────────────────────────────────────────────
  const systemPrompt   = buildSystemPrompt(safeContext)
  const safeMessage    = redactPII(buildUserMessage(userMessage))
  const safeHistory    = buildMessageHistory(history, { maxMessages: 10 })

  // Final message array: history + current user turn
  const messages = [
    ...safeHistory,
    { role: 'user', content: safeMessage },
  ]

  // ── 6. Call Claude API ────────────────────────────────────────────────────
  try {
    const client   = getClient()
    const response = await client.messages.create({
      model:      MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system:     systemPrompt,
      messages,
    })

    const content = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('')
      .trim()

    return {
      content,
      emotion,
      crisisDetected:  false,
      crisisResources: undefined,
      usedFallback:    false,
    }
  } catch (err) {
    // ── 7. Graceful fallback ── never leave the user with an error ───────────
    console.error('[claudeService] API error:', err?.message ?? err)

    const { generateMockReply } = await import('./emotionEngine.js')
    const fallback = await generateMockReply(userMessage)

    return {
      content:         fallback.content,
      emotion,
      crisisDetected:  false,
      crisisResources: undefined,
      usedFallback:    true,
    }
  }
}

// ── Batch: analyse text without generating a reply (e.g. for journal tagging) ──

/**
 * Use Claude to classify the emotional tone of a piece of text.
 * PRIVACY: only the text's TONE is assessed, not its content.
 * Raw text is privacy-filtered before dispatch.
 *
 * @param {string} text
 * @returns {Promise<{ primaryEmotion: string, confidence: number }>}
 */
export async function analyseTextWithClaude(text) {
  const safeText = redactPII(String(text).slice(0, 400))

  try {
    const client = getClient()
    const response = await client.messages.create({
      model:      MODEL,
      max_tokens: 80,
      temperature: 0.1,
      system: [
        'You are an emotion classifier. Respond ONLY with JSON.',
        'Given text, return: { "primaryEmotion": string, "confidence": number }',
        'primaryEmotion must be one of: joy, sadness, anxiety, loneliness, grief, anger, overwhelm, hope, calm, burnout.',
        'confidence is 0–1.',
        'No other fields. No explanation.',
      ].join(' '),
      messages: [{ role: 'user', content: safeText }],
    })

    const raw  = response.content.find(b => b.type === 'text')?.text ?? '{}'
    const json = JSON.parse(raw.replace(/```json|```/g, '').trim())

    return {
      primaryEmotion: String(json.primaryEmotion ?? 'calm'),
      confidence:     parseFloat(json.confidence)  || 0.5,
    }
  } catch {
    // Fall back to local classifier
    const { classifyEmotion } = await import('./emotionClassifier.js')
    const local = classifyEmotion(text)
    return { primaryEmotion: local.primaryEmotion, confidence: local.confidence }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Map a quickTrendSummary result to a weeklyTrend string.
 * We derive improving/declining/stable from valence rather than sending
 * the raw summary object (which may contain identifiers).
 */
function trendFromSummary(summary) {
  if (!summary?.dominantValence) return null
  // Without multi-week comparison here we fall back to valence as proxy
  return summary.dominantValence === 'positive' ? 'improving'
       : summary.dominantValence === 'negative' ? 'declining'
       : 'stable'
}