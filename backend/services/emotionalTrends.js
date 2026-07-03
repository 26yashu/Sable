// =============================================
// Sable — Emotional Trend Analyser
// Runs entirely locally from stored data.
// No external APIs. Privacy-preserving.
// =============================================

import MoodLog      from '../models/MoodLog.js'
import Message      from '../models/Message.js'
import JournalEntry from '../models/JournalEntry.js'
import { MOOD_EMOTION_MAP, EMOTION_VALENCE } from './emotionPatterns.js'
import { classifyEmotion } from './emotionClassifier.js'

const EMOTIONS = [
  'joy', 'sadness', 'anxiety', 'loneliness',
  'grief', 'anger', 'overwhelm', 'hope', 'calm', 'burnout',
]

// ── Date utilities ────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function toDateStr(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Aggregate emotion scores from all sources ─────────────────────────────────

/**
 * Build a weighted score map across all three data sources.
 * Weights: mood logs (primary signal) 0.5, chat text 0.3, journal tags 0.2
 */
async function aggregateEmotionScores(ownerId, days = 7) {
  const since = daysAgo(days)
  const scores = Object.fromEntries(EMOTIONS.map(e => [e, 0]))

  // ── 1. Mood logs ──────────────────────────────────────────────────────────
  const moodLogs = await MoodLog
    .find({ ownerId, createdAt: { $gte: since } })
    .lean()

  for (const log of moodLogs) {
    const emotion = MOOD_EMOTION_MAP[log.mood]
    if (emotion && scores[emotion] !== undefined) {
      // Weight by intensity (1–10 normalised to 0–1), scaled by source weight
      scores[emotion] += (log.intensity / 10) * 0.5

      // Also run classifier on note if present — it adds signal
      if (log.note?.trim()) {
        const { scores: noteScores } = classifyEmotion(log.note)
        for (const [e, s] of Object.entries(noteScores)) {
          if (scores[e] !== undefined) scores[e] += (s / 10) * 0.15
        }
      }
    }
  }

  // ── 2. Chat messages (user-sent only) ─────────────────────────────────────
  const messages = await Message
    .find({ ownerId, role: 'user', createdAt: { $gte: since } })
    .lean()

  for (const msg of messages) {
    if (!msg.content?.trim()) continue
    const { scores: msgScores } = classifyEmotion(msg.content)
    for (const [e, s] of Object.entries(msgScores)) {
      if (scores[e] !== undefined) scores[e] += (s / 10) * 0.3
    }
  }

  // ── 3. Journal mood tags ───────────────────────────────────────────────────
  const entries = await JournalEntry
    .find({ ownerId, moodTag: { $ne: null }, createdAt: { $gte: since } })
    .lean()

  for (const entry of entries) {
    const emotion = MOOD_EMOTION_MAP[entry.moodTag]
    if (emotion && scores[emotion] !== undefined) {
      scores[emotion] += 1.0 * 0.2
    }
  }

  return scores
}

// ── Build weekly trend (7-day sliding window per day) ─────────────────────────

async function buildWeeklyTrend(ownerId) {
  const trend = []

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const dayStart = daysAgo(dayOffset)
    const dayEnd   = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)

    const [moodLogs, messages] = await Promise.all([
      MoodLog.find({ ownerId, createdAt: { $gte: dayStart, $lte: dayEnd } }).lean(),
      Message.find({ ownerId, role: 'user', createdAt: { $gte: dayStart, $lte: dayEnd } }).lean(),
    ])

    const dayScores = Object.fromEntries(EMOTIONS.map(e => [e, 0]))

    for (const log of moodLogs) {
      const emotion = MOOD_EMOTION_MAP[log.mood]
      if (emotion && dayScores[emotion] !== undefined) {
        dayScores[emotion] += (log.intensity / 10)
      }
    }

    for (const msg of messages) {
      if (!msg.content?.trim()) continue
      const { scores } = classifyEmotion(msg.content)
      for (const [e, s] of Object.entries(scores)) {
        if (dayScores[e] !== undefined) dayScores[e] += s / 10
      }
    }

    const topEntry = Object.entries(dayScores).sort(([, a], [, b]) => b - a)[0]
    const totalDay = Object.values(dayScores).reduce((s, v) => s + v, 0)

    trend.push({
      date:          toDateStr(dayStart),
      dayLabel:      dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
      dominantEmotion: totalDay > 0 ? topEntry[0] : null,
      valence:       totalDay > 0 ? (EMOTION_VALENCE[topEntry[0]] ?? 'neutral') : 'neutral',
      checkInCount:  moodLogs.length + messages.length,
      emotionScores: dayScores,
      isToday:       dayOffset === 0,
    })
  }

  return trend
}

// ── Stability score ───────────────────────────────────────────────────────────
// Measures emotional consistency: high score = stable, low = volatile

function computeStabilityScore(weeklyTrend) {
  const daysWithData = weeklyTrend.filter(d => d.dominantEmotion)
  if (daysWithData.length < 2) return null

  // Count transitions between different dominant emotions
  let transitions = 0
  for (let i = 1; i < daysWithData.length; i++) {
    if (daysWithData[i].dominantEmotion !== daysWithData[i - 1].dominantEmotion) {
      transitions++
    }
  }

  // More transitions = less stable
  const maxTransitions = daysWithData.length - 1
  const stabilityRaw   = 1 - (transitions / maxTransitions)

  // Bonus for positive-valence consistency
  const positiveRatio = daysWithData.filter(d => d.valence === 'positive').length / daysWithData.length
  const score         = stabilityRaw * 0.7 + positiveRatio * 0.3

  return Math.round(score * 100) / 100 // 0.00 – 1.00
}

// ── Trend direction ───────────────────────────────────────────────────────────
// Compares first 3 days vs last 3 days of the week

function computeTrendDirection(weeklyTrend) {
  const daysWithData = weeklyTrend.filter(d => d.dominantEmotion)
  if (daysWithData.length < 4) return 'insufficient_data'

  const earlyPositive = daysWithData.slice(0, 3).filter(d => d.valence === 'positive').length
  const latePositive  = daysWithData.slice(-3).filter(d => d.valence === 'positive').length

  if (latePositive > earlyPositive) return 'improving'
  if (latePositive < earlyPositive) return 'declining'
  return 'stable'
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Full trend analysis for a user.
 *
 * @param {string} ownerId
 * @param {{ days?: number }} opts
 * @returns {Promise<{
 *   dominantEmotion: string,
 *   dominantValence: string,
 *   weeklyTrend: object[],
 *   stabilityScore: number | null,
 *   trendDirection: string,
 *   emotionBreakdown: { emotion: string, score: number, percentage: number }[],
 *   dataPoints: number,
 * }>}
 */
export async function analyseEmotionalTrends(ownerId, { days = 7 } = {}) {
  const [aggregateScores, weeklyTrend] = await Promise.all([
    aggregateEmotionScores(ownerId, days),
    buildWeeklyTrend(ownerId),
  ])

  const totalScore    = Object.values(aggregateScores).reduce((s, v) => s + v, 0)
  const ranked        = Object.entries(aggregateScores)
    .sort(([, a], [, b]) => b - a)
    .filter(([, v]) => v > 0)

  const dominantEmotion = ranked[0]?.[0] ?? 'calm'
  const dominantValence = EMOTION_VALENCE[dominantEmotion] ?? 'neutral'

  const emotionBreakdown = ranked.map(([emotion, score]) => ({
    emotion,
    score:      Math.round(score * 100) / 100,
    percentage: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
  }))

  const stabilityScore  = computeStabilityScore(weeklyTrend)
  const trendDirection  = computeTrendDirection(weeklyTrend)
  const dataPoints      = weeklyTrend.reduce((s, d) => s + d.checkInCount, 0)

  return {
    dominantEmotion,
    dominantValence,
    weeklyTrend,
    stabilityScore,
    trendDirection,
    emotionBreakdown,
    dataPoints,
  }
}

/**
 * Quick summary variant — just dominant emotion + trend direction.
 * Used inside chat/journal flows where full analysis would be too heavy.
 */
export async function quickTrendSummary(ownerId) {
  try {
    const scores = await aggregateEmotionScores(ownerId, 3)
    const ranked = Object.entries(scores).sort(([, a], [, b]) => b - a)
    return {
      dominantEmotion: ranked[0]?.[0] ?? 'calm',
      dominantValence: EMOTION_VALENCE[ranked[0]?.[0]] ?? 'neutral',
    }
  } catch {
    return { dominantEmotion: 'calm', dominantValence: 'positive' }
  }
}