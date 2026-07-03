// =============================================
// Sable — Emotional Milestones Detector
// Identifies notable moments from aggregated
// monthly data. No raw text is ever used —
// only emotion labels, scores, and counts.
// All local. No external APIs.
// =============================================

import { EMOTION_VALENCE } from './emotionPatterns.js'

const EMOTION_LABELS = {
  joy: 'Joy', sadness: 'Sadness', anxiety: 'Anxiety', loneliness: 'Loneliness',
  grief: 'Grief', anger: 'Anger', overwhelm: 'Overwhelm', hope: 'Hope',
  calm: 'Calm', burnout: 'Burnout',
}

const EMOTION_GLYPHS = {
  joy: '☀️', sadness: '🌧', anxiety: '🌀', loneliness: '🌑', grief: '🕊',
  anger: '⚡', overwhelm: '🌊', hope: '🌱', calm: '🍃', burnout: '🔥',
}

function fmtDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Individual milestone detectors ──────────────────────────────────────────────

/** First check-in of the month */
function detectFirstCheckIn(days) {
  const active = days.filter(d => d.moodLogs.length || d.chatCount || d.journalCount)
  if (!active.length) return null
  const first = active[0]
  return {
    type:  'first_checkin',
    glyph: '🌱',
    title: 'A new beginning',
    description: `Your first check-in of the month was on ${fmtDate(first.date)}.`,
    date: first.date,
  }
}

/** Longest consecutive streak of any check-in activity */
function detectConsistencyStreak(days) {
  let longest = 0, current = 0, longestStart = null, longestEnd = null
  let curStart = null

  for (const day of days) {
    const active = day.moodLogs.length || day.chatCount || day.journalCount
    if (active) {
      if (current === 0) curStart = day.date
      current++
      if (current > longest) {
        longest = current
        longestStart = curStart
        longestEnd = day.date
      }
    } else {
      current = 0
    }
  }

  if (longest < 3) return null

  return {
    type:  'consistency_streak',
    glyph: '🔥',
    title: `${longest}-day streak`,
    description: `You showed up for yourself ${longest} days in a row, from ${fmtDate(longestStart)} to ${fmtDate(longestEnd)}.`,
    date: longestEnd,
  }
}

/** Day with the highest positive-emotion score */
function detectBrightestDay(days) {
  let best = null
  for (const day of days) {
    const positiveScore = Object.entries(day.emotionScores)
      .filter(([e]) => EMOTION_VALENCE[e] === 'positive')
      .reduce((s, [, v]) => s + v, 0)
    if (positiveScore > 0 && (!best || positiveScore > best.score)) {
      best = { date: day.date, score: positiveScore, emotion: day.dominantEmotion }
    }
  }
  if (!best || best.emotion === null) return null

  return {
    type:  'brightest_day',
    glyph: EMOTION_GLYPHS[best.emotion] ?? '☀️',
    title: 'A brighter moment',
    description: `${fmtDate(best.date)} stood out as one of your lightest days — ${EMOTION_LABELS[best.emotion]?.toLowerCase() ?? 'something good'} was present.`,
    date: best.date,
  }
}

/** Day that carried the heaviest emotional weight */
function detectHeaviestDay(days) {
  let worst = null
  for (const day of days) {
    const negativeScore = Object.entries(day.emotionScores)
      .filter(([e]) => EMOTION_VALENCE[e] === 'negative')
      .reduce((s, [, v]) => s + v, 0)
    if (negativeScore > 0 && (!worst || negativeScore > worst.score)) {
      worst = { date: day.date, score: negativeScore, emotion: day.dominantEmotion }
    }
  }
  if (!worst || worst.emotion === null) return null

  return {
    type:  'heaviest_day',
    glyph: EMOTION_GLYPHS[worst.emotion] ?? '🌧',
    title: 'A harder day',
    description: `${fmtDate(worst.date)} carried more weight than most — ${EMOTION_LABELS[worst.emotion]?.toLowerCase() ?? 'something heavy'} was present. You moved through it.`,
    date: worst.date,
  }
}

/** Emotional shift: comparing first half vs second half of the month */
function detectEmotionalShift(weeks) {
  const active = weeks.filter(w => w.dominantEmotion)
  if (active.length < 2) return null

  const first = active[0]
  const last  = active[active.length - 1]

  if (first.dominantValence === last.dominantValence) return null

  const direction = last.dominantValence === 'positive' ? 'lighter' : 'heavier'

  return {
    type:  'emotional_shift',
    glyph: direction === 'lighter' ? '🌤' : '🌥',
    title: `The month grew ${direction}`,
    description: `It started with ${EMOTION_LABELS[first.dominantEmotion]?.toLowerCase()}, and moved toward ${EMOTION_LABELS[last.dominantEmotion]?.toLowerCase()} by the end.`,
    date: null,
  }
}

/** New emotion that appeared this month (requires previous month's breakdown) */
function detectNewEmotion(emotionBreakdown, previousBreakdown) {
  if (!previousBreakdown?.length) return null

  const previousEmotions = new Set(previousBreakdown.map(e => e.emotion))
  const newOnes = emotionBreakdown
    .filter(e => !previousEmotions.has(e.emotion) && e.percentage >= 10)

  if (!newOnes.length) return null

  const top = newOnes[0]
  return {
    type:  'new_emotion',
    glyph: EMOTION_GLYPHS[top.emotion] ?? '✦',
    title: `${EMOTION_LABELS[top.emotion]} emerged`,
    description: `${EMOTION_LABELS[top.emotion]} wasn't part of last month's picture — but it showed up this month.`,
    date: null,
  }
}

/** High mood-logging consistency — celebrates engagement itself */
function detectEngagementMilestone(checkInCount, activeDayCount, daysInMonth) {
  const coverage = activeDayCount / daysInMonth
  if (coverage < 0.5) return null

  return {
    type:  'engagement',
    glyph: '✦',
    title: 'Showing up for yourself',
    description: `You checked in on ${activeDayCount} of ${daysInMonth} days this month — that's ${Math.round(coverage * 100)}% presence with your own emotional life.`,
    date: null,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Detect emotional milestones from aggregated month data.
 * @param {object} monthData — output of aggregateMonth()
 * @param {object[]} [previousBreakdown] — emotionBreakdown from prior month (optional)
 * @returns {object[]} milestones, max 5, sorted by relevance
 */
export function detectMilestones(monthData, previousBreakdown = null) {
  if (!monthData.hasData) return []

  const { days, weeks, emotionBreakdown, checkInCount, activeDayCount, daysInMonth } = monthData

  const candidates = [
    detectFirstCheckIn(days),
    detectConsistencyStreak(days),
    detectBrightestDay(days),
    detectHeaviestDay(days),
    detectEmotionalShift(weeks),
    detectNewEmotion(emotionBreakdown, previousBreakdown),
    detectEngagementMilestone(checkInCount, activeDayCount, daysInMonth),
  ].filter(Boolean)

  // Sort chronologically when dates are present, undated ones (shift/engagement) go last
  candidates.sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date)
    if (a.date && !b.date) return -1
    if (!a.date && b.date) return 1
    return 0
  })

  return candidates.slice(0, 5)
}