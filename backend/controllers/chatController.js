import Message from '../models/Message.js'
import { classifyEmotion }                            from '../services/emotionClassifier.js'
import { sanitiseEmotionContext, redactPII }           from '../services/privacyFilter.js'
import { buildSystemPrompt, buildUserMessage,
         buildMessageHistory }                         from '../services/promptBuilder.js'
import { generateGeminiReply }                         from '../services/geminiService.js'
import { checkSafety }                                 from '../services/safetyResponder.js'

// ── Session resolution ────────────────────────────────────────────────────────

function resolveOwner(req) {
  if (req.user) return { ownerId: String(req.user._id), ownerType: 'user' }
  const anonId = req.headers['x-anon-id']
  if (anonId && /^[0-9a-f-]{36}$/i.test(anonId)) {
    return { ownerId: anonId, ownerType: 'anonymous' }
  }
  return null
}

// ── POST /api/chat ────────────────────────────────────────────────────────────
//
// Integrated pipeline:
//   1. Validate & extract user message
//   2. Run local emotion detection
//   3. Apply privacy filter to emotion context
//   3.5 SAFETY GATE — if crisis detected, short-circuit before any Claude call
//   4. Fetch recent history for conversation continuity
//   5. Call claudeService (builds prompt internally, calls API, falls back)
//   6. Persist user message
//   7. Persist companion/assistant response
//   8. Return both messages + emotion metadata to frontend

export async function sendMessage(req, res, next) {
  try {
    // ── Step 1: Validate ───────────────────────────────────────────────────
    const raw = req.body?.message
    if (!raw?.trim()) {
      return res.status(400).json({ error: 'Message content is required.' })
    }

    const owner = resolveOwner(req)
    if (!owner) {
      return res.status(401).json({
        error: 'No session identified. Pass X-Anon-Id or a Bearer token.',
      })
    }

    const content = raw.trim()

    // ── Step 2: Emotion detection (local, synchronous) ─────────────────────
    const emotionResult = classifyEmotion(content)

    // ── Step 3: Privacy filter ─────────────────────────────────────────────
    // Produce a narrow, PII-clean context object safe for the Claude API.
    // ownerId and ownerType are never included in what gets sent upstream.
    const safeContext = sanitiseEmotionContext({
      primaryEmotion:   emotionResult.primaryEmotion,
      secondaryEmotion: emotionResult.secondaryEmotion,
      intensity:        emotionResult.intensity,
      confidence:       emotionResult.confidence,
      crisisDetected:   emotionResult.crisisDetected,
      crisisTier:       emotionResult.crisisTier,
      // weeklyTrend resolved inside claudeService from ownerId (not sent to API)
    })

    // ── Step 4: Fetch recent conversation history ──────────────────────────
    // Limit to last 10 exchanges (20 messages) to keep prompts concise.
    const recentMessages = await Message
      .find({ ownerId: owner.ownerId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    // Reverse to chronological order for buildMessageHistory
    const history = recentMessages.reverse()

    // ── Step 5: Generate reply — safety gate first, then Claude if clear ───
    let replyContent, resolvedEmotion, crisisDetected, crisisResources, usedFallback

    const safety = checkSafety(emotionResult)
    if (safety) {
      // Crisis detected — short-circuit. Claude is never called.
      replyContent     = safety.content
      resolvedEmotion  = emotionResult
      crisisDetected   = true
      crisisResources  = safety.resources
      usedFallback     = false
    } else {
      const aiResult = await generateGeminiReply(content, {
        ownerId: owner.ownerId,
        history,
        emotion: emotionResult,
});

      replyContent    = aiResult.content;
      resolvedEmotion = aiResult.emotion;
      crisisDetected  = aiResult.crisisDetected;
      crisisResources = aiResult.crisisResources;
      usedFallback    = aiResult.usedFallback;
    }
    // ── Step 6: Persist user message ───────────────────────────────────────
    const userMessage = await Message.create({
      ...owner,
      role:    'user',
      content,
    })

    // ── Step 7: Persist companion response ─────────────────────────────────
    const companionMessage = await Message.create({
      ...owner,
      role:    'companion',
      content: replyContent,
    })

    // ── Step 8: Respond ────────────────────────────────────────────────────
    return res.status(201).json({
      userMessage:      userMessage.toObject(),
      companionMessage: companionMessage.toObject(),
      emotion: {
        primaryEmotion:   resolvedEmotion.primaryEmotion,
        secondaryEmotion: resolvedEmotion.secondaryEmotion,
        intensity:        resolvedEmotion.intensity,
        confidence:       resolvedEmotion.confidence,
        crisisDetected,
      },
      crisisResources: crisisDetected ? crisisResources : undefined,
      // Surfaced to frontend for telemetry / graceful messaging
      meta: { usedFallback: usedFallback ?? false },
    })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/chat/history ─────────────────────────────────────────────────────
//
// Returns paginated message history for the current session.
// Supports cursor-based pagination via ?before=<ISO date>.

export async function getHistory(req, res, next) {
  try {
    const owner = resolveOwner(req)
    if (!owner) {
      return res.status(401).json({ error: 'No session identified.' })
    }

    const limit  = Math.min(parseInt(req.query.limit) || 40, 100)
    const before = req.query.before

    const query = { ownerId: owner.ownerId }
    if (before) {
      const cursor = new Date(before)
      if (isNaN(cursor.getTime())) {
        return res.status(400).json({ error: 'Invalid "before" date.' })
      }
      query.createdAt = { $lt: cursor }
    }

    const messages = await Message
      .find(query)
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean()

    return res.json({ messages })
  } catch (err) {
    next(err)
  }
}