import { buildMonthlyStory } from '../services/monthlyStory.js'

function resolveOwner(req) {
  if (req.user) return { ownerId: String(req.user._id), ownerType: 'user' }
  const anonId = req.headers['x-anon-id']
  if (anonId && /^[0-9a-f-]{36}$/i.test(anonId)) return { ownerId: anonId, ownerType: 'anonymous' }
  return null
}

// GET /api/insights/monthly-story?monthsAgo=0
export async function getMonthlyStory(req, res, next) {
  try {
    const owner = resolveOwner(req)
    if (!owner) return res.status(401).json({ error: 'No session identified.' })

    const monthsAgo = Math.min(Math.max(parseInt(req.query.monthsAgo) || 0, 0), 11)
    const report    = await buildMonthlyStory(owner.ownerId, { monthsAgo })

    return res.json(report)
  } catch (err) { next(err) }
}