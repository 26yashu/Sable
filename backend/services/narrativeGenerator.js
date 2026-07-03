// =============================================
// Sable — Monthly Narrative Generator
// Produces a short, human-readable emotional
// story from aggregated monthly data only.
// Never touches raw journal/chat text.
// All local. No external APIs.
// =============================================

import { EMOTION_VALENCE } from './emotionPatterns.js'

const EMOTION_LABELS = {
  joy: 'joy', sadness: 'sadness', anxiety: 'anxiety', loneliness: 'loneliness',
  grief: 'grief', anger: 'anger', overwhelm: 'overwhelm', hope: 'hope',
  calm: 'calm', burnout: 'burnout',
}

// ── Narrative line pools ─────────────────────────────────────────────────────

const OPENING_LINES = {
  joy:        ["This month had real brightness in it.", "Joy was a recurring guest this month.", "Something good kept finding its way back this month."],
  hope:       ["This month carried a quiet hopefulness.", "Hope was a steady thread through this month.", "Something in you kept reaching forward this month."],
  calm:       ["This was a steadier month overall.", "A sense of calm ran beneath this month.", "This month had a quieter rhythm to it."],
  sadness:    ["This month carried real weight.", "Sadness moved through this month in waves.", "This was a tender, difficult month."],
  anxiety:    ["This month asked a lot of your nervous system.", "Anxiety was present often this month.", "Your mind was working overtime this month."],
  loneliness: ["This month had a quieter, more isolated quality.", "Loneliness showed up more than once this month.", "This month carried some distance — from others, maybe from yourself."],
  grief:      ["Grief moved through this month.", "Loss, in some form, was part of this month's story.", "This month carried an ache that doesn't go away on a schedule."],
  anger:      ["This month had its share of frustration.", "Something felt unfair or hard to accept this month.", "Anger had things to say this month."],
  overwhelm:  ["This was an overwhelming month.", "A lot landed at once this month.", "This month asked more of you than most."],
  burnout:    ["This month, your reserves ran low.", "Exhaustion was a throughline this month.", "This was a month of running on empty."],
}

const SHIFT_LINES = {
  lighter: "Importantly, things moved toward something lighter as the month went on.",
  heavier: "Things grew heavier as the month progressed — and that's worth gently noticing.",
}

const GROWTH_LINES = {
  high:   "Looking at the shape of the month, there's a clear sense of forward motion — more light, more steadiness, more of you showing up.",
  medium: "There's a mix here — some growth, some struggle, often both in the same week. That's what real months look like.",
  low:    "This was a month to get through more than a month to grow in. That's not a failure. Surviving counts.",
}

const ENGAGEMENT_LINES = [
  "You kept showing up — to check in, to notice, to put words to what you were feeling.",
  "Every check-in this month was a small act of self-attention.",
  "However it felt, you kept paying attention to your own inner weather.",
]

const CLOSING_LINES = [
  "Whatever this month held, it's behind you now — and you carried it.",
  "This is one chapter. There will be others, and they don't have to look the same.",
  "You don't need this month to have been perfect for it to have mattered.",
  "Thank you for showing up for yourself, even on the hard days.",
  "Every month adds to the story — this one included.",
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Growth score ──────────────────────────────────────────────────────────────

/**
 * Computes a 0-100 "growth score" from the month's data.
 * Factors:
 *  - positive valence ratio across weeks (50%)
 *  - emotional trajectory (early vs late month valence) (25%)
 *  - engagement / consistency (25%)
 */
export function computeGrowthScore(monthData) {
  const { weeks, activeDayCount, daysInMonth, checkInCount } = monthData

  const activeWeeks = weeks.filter(w => w.dominantEmotion)
  if (!activeWeeks.length) return null

  // 1. Positive ratio
  const positiveWeeks = activeWeeks.filter(w => w.dominantValence === 'positive').length
  const positiveRatio = positiveWeeks / activeWeeks.length

  // 2. Trajectory — compare first half to second half
  let trajectoryScore = 0.5 // neutral default
  if (activeWeeks.length >= 2) {
    const mid   = Math.ceil(activeWeeks.length / 2)
    const early = activeWeeks.slice(0, mid)
    const late  = activeWeeks.slice(-mid)
    const earlyPos = early.filter(w => w.dominantValence === 'positive').length / early.length
    const latePos  = late.filter(w => w.dominantValence === 'positive').length / late.length

    if (latePos > earlyPos) trajectoryScore = 0.5 + (latePos - earlyPos) * 0.5
    else if (latePos < earlyPos) trajectoryScore = 0.5 - (earlyPos - latePos) * 0.5
    else trajectoryScore = 0.5
  }

  // 3. Engagement
  const engagementRatio = Math.min(activeDayCount / daysInMonth, 1)

  const raw = positiveRatio * 0.5 + trajectoryScore * 0.25 + engagementRatio * 0.25
  return Math.round(Math.min(Math.max(raw, 0), 1) * 100)
}

function growthBand(score) {
  if (score === null) return 'unknown'
  if (score >= 60) return 'high'
  if (score >= 35) return 'medium'
  return 'low'
}

// ── Main story builder ───────────────────────────────────────────────────────

/**
 * Generates a short multi-sentence emotional story for the month.
 * Uses ONLY: dominantEmotion, emotionBreakdown, weeks (valence), growth score,
 * checkInCount, activeDayCount. Raw text is never read.
 */
export function generateMonthlyStory(monthData, growthScore) {
  if (!monthData.hasData || !monthData.dominantEmotion) {
    return {
      story: "There isn't enough data yet to tell this month's story. Each check-in, conversation, and mood log adds another page — come back once you've logged a bit more.",
      headline: 'A quiet beginning',
    }
  }

  const { dominantEmotion, weeks, emotionBreakdown, activeDayCount, daysInMonth } = monthData
  const activeWeeks = weeks.filter(w => w.dominantEmotion)

  const opening = pick(OPENING_LINES[dominantEmotion] ?? ["This month had its own emotional texture."])

  // Secondary emotion note
  const secondary = emotionBreakdown[1]
  const secondaryNote = secondary && secondary.percentage >= 15
    ? ` ${EMOTION_LABELS[secondary.emotion]?.charAt(0).toUpperCase()}${EMOTION_LABELS[secondary.emotion]?.slice(1)} was also woven through — these two often appear together.`
    : ''

  // Shift line
  let shiftLine = ''
  if (activeWeeks.length >= 2) {
    const first = activeWeeks[0]
    const last  = activeWeeks[activeWeeks.length - 1]
    if (first.dominantValence !== last.dominantValence) {
      shiftLine = ' ' + (last.dominantValence === 'positive' ? SHIFT_LINES.lighter : SHIFT_LINES.heavier)
    }
  }

  const band = growthBand(growthScore)
  const growthLine = ' ' + (GROWTH_LINES[band] ?? '')

  const engagementLine = activeDayCount / daysInMonth >= 0.3 ? ' ' + pick(ENGAGEMENT_LINES) : ''

  const closing = ' ' + pick(CLOSING_LINES)

  const story = [opening, secondaryNote, shiftLine, growthLine, engagementLine, closing]
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

  const headline = opening.replace(/\.$/, '')

  return { story, headline }
}