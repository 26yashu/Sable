// Companion reply engine — pure local, no API calls.
// Reads sable_companion_profile for personality-tinted responses.

// ── Personality modifiers ──────────────────────────────────────
// Each personality has per-emotion overrides and a fallback voice.
const PERSONALITY_VOICE = {
  gentle: {
    fallbacks: [
      "I'm here with you. Take your time.",
      "You don't have to rush. I'm listening, gently.",
      "Whatever you're carrying, you don't have to carry it alone.",
      "I'm right here. Breathe, and tell me when you're ready.",
    ],
    overrides: {
      stress:   "Let's just breathe for a moment. You don't have to solve everything right now.",
      anxious:  "You're safe here. Anxiety is loud, but I'm louder — I'm right beside you.",
      sad:      "Sadness is allowed here. Let yourself feel it, slowly.",
      lonely:   "I'm here, and I mean that. You matter to me.",
      tired:    "Please be gentle with yourself. Rest isn't weakness — it's wisdom.",
      angry:    "Your feelings make sense. I'm not going anywhere.",
      happy:    "That warmth you're feeling — I feel it too. Hold onto it.",
    },
  },
  cheerful: {
    fallbacks: [
      "Hey! I'm all ears — what's on your mind?",
      "You've got this, and I've got you. Tell me everything.",
      "I'm so glad you're here. What's going on?",
      "Let's talk! Nothing is too big or too small.",
    ],
    overrides: {
      stress:   "Okay, let's tackle this together — one thing at a time. You're not alone!",
      anxious:  "Breathe in — and out. I'm right here cheering you on!",
      sad:      "I see you, and I'm sending you so much warmth right now.",
      lonely:   "You reached out, and that's huge. I'm here and I'm happy you came.",
      tired:    "Rest up — you've earned it! I'll be right here when you're ready.",
      angry:    "That energy is valid! Let's talk it out — what happened?",
      happy:    "Yes!! Tell me everything — I love this for you!",
    },
  },
  thoughtful: {
    fallbacks: [
      "What's one thing beneath this feeling?",
      "I'm curious — what does this feel like in your body right now?",
      "There's something worth exploring here. Where does it start?",
      "What would you say if you knew no one was judging?",
    ],
    overrides: {
      stress:   "Stress often signals a gap between where we are and where we thought we'd be. What's the gap?",
      anxious:  "Anxiety tends to attach to stories. What story is your mind telling you right now?",
      sad:      "What is this sadness trying to tell you? It usually carries something important.",
      lonely:   "Loneliness is often about disconnection from self, not just others. What do you miss most?",
      tired:    "Is this physical tiredness, or something deeper — a kind of soul-tiredness?",
      angry:    "Anger often masks a wound underneath. What was hurt here?",
      happy:    "What conditions made this feeling possible? Worth understanding, so you can return here.",
    },
  },
  calm: {
    fallbacks: [
      "There's nowhere you need to be right now. Just here.",
      "Whatever is present — it's allowed.",
      "Stillness is available to you, even now.",
      "I'm here. Quietly, steadily.",
    ],
    overrides: {
      stress:   "The wave will pass. You are the shore, not the wave.",
      anxious:  "Let the anxiety be there without fighting it. Notice it, then let it settle.",
      sad:      "Sadness moves through when we stop trying to push it away. Let it be here.",
      lonely:   "In this moment, you are not alone. I'm here, and this moment is enough.",
      tired:    "Rest without guilt. The world will wait for you.",
      angry:    "Let the heat cool at its own pace. It will.",
      happy:    "A quiet happiness is a deep one. Savour it.",
    },
  },
  motivating: {
    fallbacks: [
      "You've made it through difficult days before. This is no different.",
      "You are more capable than your current moment suggests. Keep going.",
      "Every step forward counts — even the small ones.",
      "I believe in you. Let's figure this out together.",
    ],
    overrides: {
      stress:   "Pressure creates diamonds. You're being shaped, not broken.",
      anxious:  "Anxiety is your brain preparing you. Channel it — what's the next small step?",
      sad:      "Even on the hardest days, you're still here. That matters enormously.",
      lonely:   "You reached out. That's strength. Now let's build from here.",
      tired:    "Rest is part of the work. Recharge so you can come back stronger.",
      angry:    "That fire in you? It's power. Let's aim it at something useful.",
      happy:    "Build on this! What can you do while the momentum is with you?",
    },
  },
};

// ── Base reply rules (keyword → responses) ─────────────────────
const BASE_REPLIES = [
  { key: "stress",   patterns: [/stress(ed|ful)?|overwhelm(ed)?|too much/i],
    responses: [
      "I'm here with you. Want to tell me what's weighing on you today?",
      "That sounds heavy. You don't have to carry it alone — I'm listening.",
      "Stress has a way of piling up quietly. What feels like the biggest part of it right now?",
    ],
  },
  { key: "anxious",  patterns: [/anxious|anxiety|nervous|worry|worried/i],
    responses: [
      "Anxiety can feel so loud. Take a slow breath with me — I'm not going anywhere.",
      "I hear you. What's your mind circling around most right now?",
      "You're safe here. Want to share what's making you feel this way?",
    ],
  },
  { key: "sad",      patterns: [/sad|depress(ed|ion)?|down|low|unhappy|empty/i],
    responses: [
      "I'm glad you told me. Sadness deserves to be witnessed, not rushed past.",
      "You don't have to explain it perfectly. Just being here with it is enough.",
      "That kind of heaviness is real. I'm sitting with you in it.",
    ],
  },
  { key: "lonely",   patterns: [/lonely|alone|isolated|no one/i],
    responses: [
      "Loneliness is one of the hardest feelings. I'm here — really here.",
      "You reached out, and that matters. I'm listening to every word.",
      "You're not alone in this moment, even if it feels that way.",
    ],
  },
  { key: "tired",    patterns: [/tired|exhausted|burned? ?out|drained/i],
    responses: [
      "Rest is something you deserve, not something you have to earn.",
      "Tired bodies and tired minds both need gentleness.",
      "It's okay to slow down. You don't have to push through everything alone.",
    ],
  },
  { key: "angry",    patterns: [/angry|furious|mad|rage|frustrat(ed|ing)/i],
    responses: [
      "That frustration makes sense. Want to tell me more about what happened?",
      "Anger often points to something that really matters to you. What's underneath it?",
      "It's okay to feel this. I'm not going anywhere — tell me everything.",
    ],
  },
  { key: "happy",    patterns: [/happy|good|great|wonderful|joy(ful)?|excited/i],
    responses: [
      "That's genuinely lovely to hear. What's brought this feeling on?",
      "I love that for you. Tell me more — I want to hear all of it.",
      "Good moments deserve to be savoured. I'm glad you're in one.",
    ],
  },
  { key: null, patterns: [/thank(s| you)|grateful/i],
    responses: [
      "Always. This space is yours, whenever you need it.",
      "I'm just glad to be here with you.",
      "Thank you for trusting me with this.",
    ],
  },
  { key: null, patterns: [/hello|hi|hey|hiya|good (morning|evening|afternoon|night)/i],
    responses: [
      "Hello. I'm here — how are you feeling right now?",
      "Hey, I'm glad you're here. What's on your mind?",
      "Hi. Take your time. I'm listening.",
    ],
  },
  { key: null, patterns: [/help|don'?t know what to do|lost|confused/i],
    responses: [
      "Let's figure it out together, slowly. Start wherever feels natural.",
      "You don't need to have it all sorted out. Just talk — I'll be right here.",
      "I'm with you. What feels most uncertain right now?",
    ],
  },
];

const DEFAULT_FALLBACKS = [
  "I hear you. Can you tell me a little more about that?",
  "Thank you for sharing that with me. I'm listening.",
  "That sounds important. I want to understand — keep going.",
  "I'm here. Whatever you're feeling, it's okay to say it.",
  "You have my full attention. What else is on your mind?",
];

let _fallbackIndex = 0;

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getPersonality() {
  try {
    const raw = localStorage.getItem("sable_companion_profile");
    if (!raw) return "gentle";
    const p = JSON.parse(raw);
    return p.personality || "gentle";
  } catch { return "gentle"; }
}

export function getCompanionReply(userText) {
  const trimmed     = userText.trim();
  const personality = getPersonality();
  const voice       = PERSONALITY_VOICE[personality] || PERSONALITY_VOICE.gentle;

  for (const rule of BASE_REPLIES) {
    if (rule.patterns.some((p) => p.test(trimmed))) {
      // Use personality override if available for this key
      if (rule.key && voice.overrides[rule.key]) {
        return voice.overrides[rule.key];
      }
      return pickRandom(rule.responses);
    }
  }

  // Personality fallback
  const reply = voice.fallbacks[_fallbackIndex % voice.fallbacks.length];
  _fallbackIndex++;
  return reply;
}
