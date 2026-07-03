import { aggregateWeek, weekLabel }    from '../services/weeklyInsights.js'
import { generateInsightSummary }      from '../services/insightGenerator.js'

function resolveOwner(req) {
  if (req.user) return { ownerId: String(req.user._id), ownerType: 'user' }
  const anonId = req.headers['x-anon-id']
  if (anonId && /^[0-9a-f-]{36}$/i.test(anonId)) return { ownerId: anonId, ownerType: 'anonymous' }
  return null
}

// GET /api/insights/weekly?weeksAgo=0
export async function getWeeklyInsights(req, res, next) {
  try {
    const owner = resolveOwner(req)
    if (!owner) return res.status(401).json({ error: 'No session identified.' })

    const weeksAgo = Math.min(Math.max(parseInt(req.query.weeksAgo) || 0, 0), 12)
    const weekData = await aggregateWeek(owner.ownerId, weeksAgo)
    const insights = generateInsightSummary(weekData)

    return res.json({
      dominantEmotion:  weekData.dominantEmotion,
      dominantValence:  weekData.dominantValence,
      weekLabel:        weekLabel(weeksAgo),
      weekBounds:       weekData.weekBounds,
      weeksAgo,
      summary:          insights.summary,
      headline:         insights.headline,
      weeklyTrend:      insights.weeklyTrend,
      stabilityScore:   insights.stabilityScore,
      positiveStreak:   insights.positiveStreak,
      checkInCount:     weekData.checkInCount,
      averageIntensity: weekData.averageIntensity,
      days:             weekData.days,
      emotionBreakdown: weekData.emotionBreakdown,
      moodDistribution: weekData.moodDistribution,
      hasData:          weekData.hasData,
    })
  } catch (err) { next(err) }
}