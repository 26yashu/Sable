// =============================================
// Sable — Mock emotional response engine
// Produces contextually warm companion replies.
// Will be replaced by real AI in Phase 7.
// =============================================

// ── Response pools by detected emotional register ────────────────────────────

const pools = {
  grief: [
    'Grief is love with nowhere to go. I'm here.',
    'There's no right way to feel this. Just breathe.',
    'You don't have to hold this alone.',
    'That kind of loss leaves a mark. I see you.',
    'I'm not going anywhere. Take all the time you need.',
  ],

  anxiety: [
    'You're safe here, right now, in this moment.',
    'Let's slow down together. What feels most heavy?',
    'Anxiety can make everything feel urgent. It's okay to pause.',
    'I'm with you. You don't have to figure it all out tonight.',
    'That sounds exhausting to carry. Tell me more.',
  ],

  loneliness: [
    'You reached out — that matters more than you know.',
    'I'm here with you.',
    'Loneliness is real. And so is this moment between us.',
    'You're not as alone as it feels right now.',
    'I hear you. I'm listening.',
  ],

  anger: [
    'That frustration makes complete sense.',
    'Anger is often grief pointing at something that matters.',
    'You're allowed to feel this.',
    'What's underneath the anger? I'm curious.',
    'That sounds genuinely hard. I'm not going anywhere.',
  ],

  joy: [
    'That's beautiful. Hold onto that.',
    'I love hearing this. Tell me more.',
    'Something shifted, didn't it? I can feel it.',
    'You deserve this moment.',
    'That warmth — yes. Let it stay.',
  ],

  neutral: [
    'I'm here with you.',
    'Tell me more.',
    'That sounds difficult. How are you sitting with it?',
    'You're safe here.',
    'I'm listening. All of it.',
    'What does this feel like in your body?',
    'There's no rush. Take your time.',
    'Thank you for trusting me with this.',
    'Something in what you said is sitting with me. Go on.',
    'I hear you.',
  ],

  greeting: [
    'Hello. I'm glad you're here.',
    'Hi. How are you, really?',
    'Hey. What's on your heart today?',
    'I've been here, waiting. What's going on?',
  ],
}

// ── Keyword classifiers ───────────────────────────────────────────────────────

const classifiers = [
  {
    register: 'grief',
    keywords: ['grief', 'loss', 'died', 'death', 'miss', 'gone', 'funeral', 'mourn', 'passed away', 'heartbroken'],
  },
  {
    register: 'anxiety',
    keywords: ['anxious', 'anxiety', 'panic', 'scared', 'fear', 'nervous', 'overwhelm', 'stress', 'worry', 'overthink', 'can\'t stop'],
  },
  {
    register: 'loneliness',
    keywords: ['lonely', 'alone', 'isolated', 'no one', 'nobody', 'disconnected', 'invisible', 'left out'],
  },
  {
    register: 'anger',
    keywords: ['angry', 'anger', 'furious', 'rage', 'frustrated', 'unfair', 'hate', 'annoyed', 'pissed'],
  },
  {
    register: 'joy',
    keywords: ['happy', 'excited', 'grateful', 'good news', 'wonderful', 'amazing', 'joy', 'thrilled', 'love', 'great day', 'finally'],
  },
  {
    register: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'good night', 'howdy'],
  },
]

// ── Utility ───────────────────────────────────────────────────────────────────

function detectRegister(text) {
  const lower = text.toLowerCase()
  for (const { register, keywords } of classifiers) {
    if (keywords.some((kw) => lower.includes(kw))) return register
  }
  return 'neutral'
}

function pickFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Simulate a realistic thinking delay (0.8 – 2.4 s)
function thinkingDelay() {
  return new Promise((resolve) =>
    setTimeout(resolve, 800 + Math.random() * 1600)
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a mock emotional companion reply for a given user message.
 * Returns { content: string } after a realistic pause.
 */
export async function generateMockReply(userMessage) {
  await thinkingDelay()

  const register = detectRegister(userMessage)
  const content  = pickFrom(pools[register] ?? pools.neutral)

  return { content }
}