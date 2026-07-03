// =============================================
// Sable — Weekly Insights Data Layer
// Aggregates mood, chat, and journal data for
// a specific ISO calendar week. All local.
// =============================================

import MoodLog      from '../models/MoodLog.js'
import Message      from '../models/Message.js'
import JournalEntry from '../models/JournalEntry.js'
import { MOOD_EMOTION_MAP, EMOTION_VALENCE } from './emotionPatterns.js'
import { classifyEmotion }                   from './emotionClassifier.js'

const EMOTIONS = [
  'joy', 'sadness', 'anxiety', 'loneliness',
  'grief', 'anger', 'overwhelm', 'hope', 'calm', 'burnout',
]

export function getWeekBounds(weeksAgo = 0) {
  const now = new Date()
  const dow = now.getDay()
  const mondayOffset = (dow === 0 ? -6 : 1 - dow)
  const thisMonday = new Date(now)
  thisMonday.setDate(now.getDate() + mondayOffset - weeksAgo * 7)
  thisMonday.setHours(0, 0, 0, 0)
  const sunday = new Date(thisMonday)
  sunday.setDate(thisMonday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: thisMonday, end: sunday }
}

export function weekLabel(weeksAgo = 0) {
  if (weeksAgo === 0) return 'This week'
  if (weeksAgo === 1) return 'Last week'
  const { start } = getWeekBounds(weeksAgo)
  return start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function buildDaySlots(start) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return {
      date:      toDateStr(d),
      dayLabel:  d.toLocaleDateString('en-US', { weekday: 'short' }),
      fullDate:  d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      isToday:   toDateStr(d) === toDateStr(new Date()),
      emotionScores:   Object.fromEntries(EMOTIONS.map(e => [e, 0])),
      moodLogs:        [],
      chatCount:       0,
      journalCount:    0,
      dominantEmotion: null,
      intensity:       null,
    }
  })
}

export async function aggregateWeek(ownerId, weeksAgo = 0) {
  const { start, end } = getWeekBounds(weeksAgo)

  const [moodLogs, messages, journalEntries] = await Promise.all([
    MoodLog.find({ ownerId, createdAt: { $gte: start, $lte: end } }).lean(),
    Message.find({ ownerId, role: 'user', createdAt: { $gte: start, $lte: end } }).lean(),
    JournalEntry.find({ ownerId, moodTag: { $ne: null }, deletedAt: null, createdAt: { $gte: start, $lte: end } }).lean(),
  ])

  const days     = buildDaySlots(start)
  const dayIndex = Object.fromEntries(days.map(d => [d.date, d]))

  // Mood logs — weight 0.5
  const moodDistribution = {}
  let intensitySum = 0, intensityCount = 0

  for (const log of moodLogs) {
    const day     = dayIndex[toDateStr(new Date(log.createdAt))]
    const emotion = MOOD_EMOTION_MAP[log.mood]
    if (!day || !emotion) continue
    day.emotionScores[emotion] = (day.emotionScores[emotion] || 0) + (log.intensity / 10) * 0.5
    day.moodLogs.push({ mood: log.mood, intensity: log.intensity, note: log.note })
    moodDistribution[log.mood] = (moodDistribution[log.mood] || 0) + 1
    intensitySum += log.intensity; intensityCount++
  }

  // Chat messages — weight 0.3
  const chatEmotions = {}
  for (const msg of messages) {
    if (!msg.content?.trim()) continue
    const day = dayIndex[toDateStr(new Date(msg.createdAt))]
    if (!day) continue
    day.chatCount++
    const { primaryEmotion, scores } = classifyEmotion(msg.content)
    for (const [e, s] of Object.entries(scores)) {
      if (day.emotionScores[e] !== undefined) day.emotionScores[e] += (s / 10) * 0.3
    }
    chatEmotions[primaryEmotion] = (chatEmotions[primaryEmotion] || 0) + 1
  }

  // Journal tags — weight 0.2
  const journalTags = {}
  for (const entry of journalEntries) {
    const day     = dayIndex[toDateStr(new Date(entry.createdAt))]
    const emotion = MOOD_EMOTION_MAP[entry.moodTag]
    if (!day || !emotion) continue
    day.emotionScores[emotion] = (day.emotionScores[emotion] || 0) + 0.2
    day.journalCount++
    journalTags[entry.moodTag] = (journalTags[entry.moodTag] || 0) + 1
  }

  // Resolve dominant per day
  for (const day of days) {
    const ranked = Object.entries(day.emotionScores).sort(([,a],[,b]) => b - a).filter(([,v]) => v > 0)
    if (!ranked.length) continue
    day.dominantEmotion = ranked[0][0]
    day.intensity = day.moodLogs.length > 0
      ? Math.round(day.moodLogs.reduce((s,l) => s+l.intensity, 0) / day.moodLogs.length)
      : Math.min(10, Math.max(1, Math.round(ranked[0][1] * 5 + 1)))
  }

  // Week-level totals
  const weekScores = Object.fromEntries(EMOTIONS.map(e => [e, 0]))
  for (const day of days) {
    for (const [e, s] of Object.entries(day.emotionScores)) weekScores[e] += s
  }

  const rankedWeek    = Object.entries(weekScores).sort(([,a],[,b]) => b - a).filter(([,v]) => v > 0)
  const dominantEmotion = rankedWeek[0]?.[0] ?? null
  const totalScore      = rankedWeek.reduce((s,[,v]) => s + v, 0)
  const emotionBreakdown = rankedWeek.map(([emotion, score]) => ({
    emotion,
    score:      Math.round(score * 100) / 100,
    percentage: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
    valence:    EMOTION_VALENCE[emotion] ?? 'neutral',
  }))

  return {
    weekBounds:      { start: start.toISOString(), end: end.toISOString() },
    weeksAgo,
    days,
    dominantEmotion,
    dominantValence: dominantEmotion ? (EMOTION_VALENCE[dominantEmotion] ?? 'neutral') : null,
    emotionBreakdown,
    moodDistribution,
    chatEmotions,
    journalTags,
    checkInCount:    moodLogs.length + messages.length + journalEntries.length,
    averageIntensity: intensityCount > 0 ? Math.round((intensitySum / intensityCount) * 10) / 10 : null,
    hasData:         moodLogs.length + messages.length + journalEntries.length > 0,
  }
}