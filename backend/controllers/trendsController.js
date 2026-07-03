import { analyseEmotionalTrends } from '../services/emotionEngine.js'
import { analyseText }            from '../services/emotionEngine.js'

function resolveOwner(req) {
  if (req.user) return { ownerId: String(req.user._id), ownerType: 'user' }
  const anonId = req.headers['x-anon-id']
  if (anonId && /^[0-9a-f-]{36}$/i.test(anonId)) return { ownerId: anonId, ownerType: 'anonymous' }
  return null
}

// GET /api/trends
export async function getTrends(req, res, next) {
  try {
    const owner = resolveOwner(req)
    if (!owner) return res.status(401).json({ error: 'No session identified.' })

    const days   = Math.min(parseInt(req.query.days) || 7, 30)
    const trends = await analyseEmotionalTrends(owner.ownerId, { days })

    return res.json(trends)
  } catch (err) { next(err) }
}

// POST /api/trends/analyse
// Classify a single text snippet on demand (no storage, no logging)
export async function analyseTextEndpoint(req, res, next) {
  try {
    const { text } = req.body
    if (!text?.trim()) return res.status(400).json({ error: 'text is required.' })

    const result = analyseText(text.trim())

    // Never return raw scores (privacy hygiene — they contain lexicon fingerprints)
    return res.json({
      primaryEmotion:   result.primaryEmotion,
      secondaryEmotion: result.secondaryEmotion,
      intensity:        result.intensity,
      confidence:       result.confidence,
      crisisDetected:   result.crisisDetected,
      crisisTier:       result.crisisTier,
    })
  } catch (err) { next(err) }
}