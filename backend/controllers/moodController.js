import MoodLog from '../models/MoodLog.js'

function resolveOwner(req) {
  if (req.user) return { ownerId: String(req.user._id), ownerType: 'user' }
  const anonId = req.headers['x-anon-id']
  if (anonId && /^[0-9a-f-]{36}$/i.test(anonId)) return { ownerId: anonId, ownerType: 'anonymous' }
  return null
}

// POST /api/mood
export async function logMood(req, res, next) {
  try {
    const owner = resolveOwner(req)
    if (!owner) return res.status(401).json({ error: 'No session identified.' })
    const { mood, intensity = 5, note = '' } = req.body
    if (!mood) return res.status(400).json({ error: 'Mood is required.' })
    const log = await MoodLog.create({ ...owner, mood, intensity, note })
    return res.status(201).json({ log: log.toSafeObject() })
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message })
    next(err)
  }
}

// GET /api/mood
export async function getMoodHistory(req, res, next) {
  try {
    const owner = resolveOwner(req)
    if (!owner) return res.status(401).json({ error: 'No session identified.' })
    const limit  = Math.min(parseInt(req.query.limit) || 20, 100)
    const before = req.query.before
    const query  = { ownerId: owner.ownerId }
    if (before) query.createdAt = { $lt: new Date(before) }
    const logs = await MoodLog.find(query).sort({ createdAt: -1 }).limit(limit).lean()
    return res.json({ logs: logs.map(l => ({ id: l._id, mood: l.mood, intensity: l.intensity, note: l.note, createdAt: l.createdAt })) })
  } catch (err) { next(err) }
}

// GET /api/mood/stats
export async function getMoodStats(req, res, next) {
  try {
    const owner = resolveOwner(req)
    if (!owner) return res.status(401).json({ error: 'No session identified.' })

    const allLogs = await MoodLog.find({ ownerId: owner.ownerId }).sort({ createdAt: -1 }).lean()
    const totalCheckins = allLogs.length

    if (totalCheckins === 0) {
      return res.json({ totalCheckins: 0, currentStreak: 0, longestStreak: 0, averageIntensity: null, weeklyDistribution: [], recentWeek: buildEmptyWeek() })
    }

    const averageIntensity = Math.round((allLogs.reduce((s, l) => s + l.intensity, 0) / totalCheckins) * 10) / 10

    const daySet     = new Set(allLogs.map(l => toDateStr(l.createdAt)))
    const sortedDays = [...daySet].sort().reverse()
    const todayStr   = toDateStr(new Date())
    const yestStr    = offsetDay(todayStr, -1)

    let currentStreak = 0
    if (daySet.has(todayStr) || daySet.has(yestStr)) {
      let cursor = daySet.has(todayStr) ? todayStr : yestStr
      while (daySet.has(cursor)) { currentStreak++; cursor = offsetDay(cursor, -1) }
    }

    let longestStreak = 0, run = 1
    for (let i = 0; i < sortedDays.length - 1; i++) {
      dayDiff(sortedDays[i + 1], sortedDays[i]) === -1 ? run++ : (longestStreak = Math.max(longestStreak, run), run = 1)
    }
    longestStreak = Math.max(longestStreak, run, currentStreak)

    const sevenAgo = new Date(); sevenAgo.setDate(sevenAgo.getDate() - 6); sevenAgo.setHours(0,0,0,0)
    const weekLogs = allLogs.filter(l => new Date(l.createdAt) >= sevenAgo)
    const moodCounts = {}
    weekLogs.forEach(l => { moodCounts[l.mood] = (moodCounts[l.mood] || 0) + 1 })
    const weeklyDistribution = Object.entries(moodCounts).map(([mood, count]) => ({ mood, count })).sort((a,b) => b.count - a.count)

    return res.json({ totalCheckins, currentStreak, longestStreak, averageIntensity, weeklyDistribution, recentWeek: buildRecentWeek(weekLogs) })
  } catch (err) { next(err) }
}

function toDateStr(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function offsetDay(dateStr, offset) {
  const d = new Date(dateStr + 'T12:00:00Z'); d.setDate(d.getDate() + offset); return toDateStr(d)
}
function dayDiff(a, b) {
  return Math.round((new Date(a+'T12:00:00Z') - new Date(b+'T12:00:00Z')) / 86400000)
}
function buildEmptyWeek() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return { date: toDateStr(d), dayLabel: d.toLocaleDateString('en-US', { weekday: 'short' }), mood: null, intensity: null, count: 0, isToday: i === 6 }
  })
}
function buildRecentWeek(weekLogs) {
  const week = buildEmptyWeek()
  const byDate = {}
  weekLogs.forEach(l => { const k = toDateStr(l.createdAt); (byDate[k] = byDate[k] || []).push(l) })
  week.forEach(day => {
    const logs = byDate[day.date]
    if (!logs?.length) return
    day.mood = logs[0].mood; day.intensity = logs[0].intensity; day.count = logs.length
  })
  return week
}