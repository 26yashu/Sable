// =============================================
// Sable — Insight Generator
// Produces human-readable insight narratives
// from weekly aggregated emotion data.
// All local. No external APIs.
// =============================================

import { EMOTION_VALENCE } from './emotionPatterns.js'

// ── Stability score ───────────────────────────────────────────────────────────

export function computeStabilityScore(days) {
  const activeDays = days.filter(d => d.dominantEmotion)
  if (activeDays.length < 2) return null

  let transitions = 0
  for (let i = 1; i < activeDays.length; i++) {
    if (activeDays[i].dominantEmotion !== activeDays[i-1].dominantEmotion) transitions++
  }

  const maxTransitions   = activeDays.length - 1
  const consistencyScore = 1 - (transitions / maxTransitions)
  const positiveRatio    = activeDays.filter(d => EMOTION_VALENCE[d.dominantEmotion] === 'positive').length / activeDays.length
  return Math.round((consistencyScore * 0.7 + positiveRatio * 0.3) * 100) / 100
}

// ── Trend direction ───────────────────────────────────────────────────────────

export function computeWeeklyTrend(days) {
  const active = days.filter(d => d.dominantEmotion)
  if (active.length < 3) return 'insufficient_data'

  const half     = Math.floor(active.length / 2)
  const earlyPos = active.slice(0, half).filter(d => EMOTION_VALENCE[d.dominantEmotion] === 'positive').length
  const latePos  = active.slice(-half).filter(d => EMOTION_VALENCE[d.dominantEmotion] === 'positive').length

  if (latePos > earlyPos)  return 'improving'
  if (latePos < earlyPos)  return 'declining'
  return 'stable'
}

// ── Streak helpers ────────────────────────────────────────────────────────────

export function findPositiveStreak(days) {
  let current = 0, longest = 0, run = 0
  const today = new Date().toDateString()
  let onToday = false

  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i]
    if (new Date(d.date + 'T12:00:00').toDateString() === today) onToday = true
    if (d.dominantEmotion && EMOTION_VALENCE[d.dominantEmotion] === 'positive') {
      run++
      longest = Math.max(longest, run)
      if (onToday || i === days.length - 1) current = run
    } else {
      run = 0
    }
  }
  return { current, longest }
}

// ── Narrative summaries ───────────────────────────────────────────────────────

const OPENING_LINES = {
  joy:        ["This was a week that held some brightness.", "Joy showed up for you this week.", "Something warm ran through this week."],
  hope:       ["You carried something hopeful this week.", "This week held a thread of hope.", "Optimism was present in your week."],
  calm:       ["A quieter week — there's real value in that.", "Stillness found you this week.", "This week had a calm quality to it."],
  sadness:    ["This was a heavy week. That's okay to name.", "Something tender and difficult ran through this week.", "Sadness was present this week — and you were still here."],
  anxiety:    ["Anxiety made itself known this week.", "Your nervous system was working hard this week.", "This week carried a lot of worry."],
  loneliness: ["Loneliness visited this week.", "A quiet kind of aloneness ran through this week.", "This week felt more isolated than others."],
  grief:      ["Grief moved through your week.", "Loss was a presence this week.", "This week carried something heavy — loss, or the ache of it."],
  anger:      ["Frustration and anger showed up this week.", "Something felt unjust or hard this week.", "Your anger had something to say this week."],
  overwhelm:  ["This week was a lot.", "Overwhelm was a theme this week.", "Too much landed in one week."],
  burnout:    ["Exhaustion was central this week.", "Your reserves were low this week.", "Burnout was speaking loudly this week."],
}

const TREND_LINES = {
  improving:         "And as the week moved forward, something eased — a quiet improvement worth noticing.",
  declining:         "The week got harder as it went. That's okay to acknowledge.",
  stable:            "The emotional weather was fairly consistent — neither escalating nor settling.",
  insufficient_data: "There wasn't enough data to see a clear direction.",
}

const STABILITY_LINES = {
  high:    "Your emotional experience was steady this week. That kind of consistency takes quiet strength.",
  medium:  "There were some shifts this week — which is human. Emotion rarely holds still.",
  low:     "This week moved through a lot of emotional territory. That can be tiring to navigate.",
  unknown: "Not enough data to measure emotional consistency this week.",
}

const SOURCE_LINES = {
  moodOnly:    "Mood check-ins were your primary signal this week.",
  chatOnly:    "Your conversations held most of your emotional expression this week.",
  journalOnly: "Your journal carried most of the emotional weight this week.",
  all:         "Mood logs, conversations, and journal entries all contributed to your picture this week.",
  mixed:       "A mix of check-ins and reflections built this week's portrait.",
}

const CLOSING_LINES = [
  "Whatever you felt, it was real. And now it's held here.",
  "Your feelings matter — all of them, even the ones that don't make sense.",
  "Noticing what was present is its own kind of courage.",
  "You were paying attention. That's not nothing.",
  "However the week felt, you made it through. That counts.",
  "Something in you kept going. That's worth recognising.",
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function classifyStability(score) {
  if (score === null) return 'unknown'
  if (score >= 0.65)  return 'high'
  if (score >= 0.4)   return 'medium'
  return 'low'
}

function detectPrimarySource(checkInCount, moodCount, chatCount, journalCount) {
  if (moodCount > 0 && chatCount > 0 && journalCount > 0) return 'all'
  if (moodCount > 0 && (chatCount > 0 || journalCount > 0)) return 'mixed'
  if (moodCount > 0 && chatCount === 0 && journalCount === 0) return 'moodOnly'
  if (chatCount > 0 && moodCount === 0 && journalCount === 0) return 'chatOnly'
  if (journalCount > 0 && moodCount === 0 && chatCount === 0) return 'journalOnly'
  return 'mixed'
}

// ── Main narrative builder ────────────────────────────────────────────────────

export function generateInsightSummary(weekData) {
  const {
    dominantEmotion,
    emotionBreakdown,
    days,
    checkInCount,
    moodDistribution,
    chatEmotions,
    journalTags,
  } = weekData

  if (!weekData.hasData || !dominantEmotion) {
    return {
      summary:        'No data was recorded this week. Your first check-in, message, or journal entry will build your first reflection.',
      headline:       'Nothing yet',
      weeklyTrend:    'insufficient_data',
      stabilityScore: null,
      positiveStreak: null,
    }
  }

  const stabilityScore  = computeStabilityScore(days)
  const weeklyTrend     = computeWeeklyTrend(days)
  const positiveStreak  = findPositiveStreak(days)
  const stabilityClass  = classifyStability(stabilityScore)

  const moodCount    = Object.values(moodDistribution).reduce((s,v) => s+v, 0)
  const chatCount    = Object.values(chatEmotions).reduce((s,v) => s+v, 0)
  const journalCount = Object.values(journalTags).reduce((s,v) => s+v, 0)
  const sourceKey    = detectPrimarySource(checkInCount, moodCount, chatCount, journalCount)

  // Build secondary emotion note
  const secondary  = emotionBreakdown[1]
  const secondaryNote = secondary && secondary.percentage >= 15
    ? ` ${secondary.emotion.charAt(0).toUpperCase() + secondary.emotion.slice(1)} was also present — often the two move together.`
    : ''

  const openingPool = OPENING_LINES[dominantEmotion] ?? ["This week carried its own emotional weight."]
  const opening     = pick(openingPool)
  const trendLine   = TREND_LINES[weeklyTrend] ?? ''
  const stabilityLine = STABILITY_LINES[stabilityClass]
  const sourceLine  = SOURCE_LINES[sourceKey]
  const closing     = pick(CLOSING_LINES)

  const summary = [opening, secondaryNote, trendLine, stabilityLine, sourceLine, closing]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()

  const headline = opening.replace(/\.$/, '')

  return {
    summary,
    headline,
    weeklyTrend,
    stabilityScore,
    positiveStreak,
  }
}