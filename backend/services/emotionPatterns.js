// =============================================
// Sable — Emotion Pattern Library
// All analysis runs locally. No external APIs.
// =============================================

// ── Emotion lexicons ──────────────────────────────────────────────────────────
// Each entry: { terms: string[], weight: number }
// weight 1 = mild signal, 2 = moderate, 3 = strong indicator

export const EMOTION_LEXICONS = {
  joy: [
    { terms: ['happy', 'happiness', 'joyful', 'joyous', 'joy'],                    weight: 3 },
    { terms: ['excited', 'excitement', 'thrilled', 'elated', 'ecstatic'],          weight: 3 },
    { terms: ['grateful', 'gratitude', 'thankful', 'blessed'],                     weight: 2 },
    { terms: ['wonderful', 'amazing', 'fantastic', 'brilliant', 'great'],          weight: 2 },
    { terms: ['love', 'loved', 'loving', 'adore', 'cherish'],                      weight: 2 },
    { terms: ['smile', 'laughing', 'laugh', 'giggle', 'grin'],                     weight: 1 },
    { terms: ['good day', 'great day', 'best day', 'perfect day'],                 weight: 3 },
    { terms: ['finally', 'at last', 'so relieved'],                                weight: 1 },
    { terms: ['proud', 'proud of myself', 'accomplished'],                         weight: 2 },
    { terms: ['light', 'lighter', 'lifted', 'free', 'freedom'],                   weight: 1 },
  ],

  sadness: [
    { terms: ['sad', 'sadness', 'unhappy', 'miserable', 'depressed', 'depression'], weight: 3 },
    { terms: ['crying', 'cry', 'tears', 'sobbing', 'wept', 'weeping'],             weight: 3 },
    { terms: ['heartbroken', 'broken heart', 'devastated', 'crushed'],             weight: 3 },
    { terms: ['lost', 'empty', 'hollow', 'numb', 'void'],                          weight: 2 },
    { terms: ['hopeless', 'no hope', 'pointless', 'meaningless'],                  weight: 3 },
    { terms: ['hurting', 'in pain', 'aching', 'hurt'],                             weight: 2 },
    { terms: ['down', 'low', 'gloomy', 'bleak', 'dark'],                           weight: 1 },
    { terms: ['disappointed', 'disappointment', 'let down', 'deflated'],           weight: 2 },
    { terms: ['miss', 'missing', 'missed', 'wish things were different'],          weight: 1 },
    { terms: ['can\'t stop crying', 'everything hurts', 'nothing helps'],          weight: 3 },
  ],

  anxiety: [
    { terms: ['anxious', 'anxiety', 'anxiousness', 'anxiously'],                   weight: 3 },
    { terms: ['panic', 'panicking', 'panic attack', 'panicked'],                   weight: 3 },
    { terms: ['worried', 'worry', 'worrying', 'fear', 'scared', 'terrified'],      weight: 3 },
    { terms: ['nervous', 'nervousness', 'on edge', 'uneasy'],                      weight: 2 },
    { terms: ['stress', 'stressed', 'stressful', 'stressing'],                     weight: 2 },
    { terms: ['overthinking', 'overthink', 'can\'t stop thinking', 'spiraling'],   weight: 3 },
    { terms: ['racing thoughts', 'mind won\'t stop', 'racing mind'],               weight: 3 },
    { terms: ['heart racing', 'chest tight', 'can\'t breathe', 'shallow breath'],  weight: 3 },
    { terms: ['what if', 'what if i', 'catastrophizing'],                           weight: 2 },
    { terms: ['dreading', 'dread', 'apprehensive', 'apprehension'],                weight: 2 },
    { terms: ['trembling', 'shaking', 'dizzy', 'nauseous', 'sweating'],           weight: 2 },
    { terms: ['restless', 'can\'t sit still', 'fidgeting', 'agitated'],            weight: 1 },
  ],

  loneliness: [
    { terms: ['lonely', 'loneliness', 'alone', 'solitary'],                        weight: 3 },
    { terms: ['isolated', 'isolation', 'cut off', 'disconnected'],                 weight: 3 },
    { terms: ['no one', 'nobody', 'no friends', 'friendless'],                     weight: 3 },
    { terms: ['invisible', 'unseen', 'unnoticed', 'overlooked', 'ignored'],        weight: 2 },
    { terms: ['left out', 'excluded', 'unwanted', 'rejected', 'rejection'],        weight: 3 },
    { terms: ['no one understands', 'nobody gets it', 'misunderstood'],            weight: 3 },
    { terms: ['by myself', 'on my own', 'all alone', 'no one there'],              weight: 2 },
    { terms: ['unloved', 'unlovable', 'unworthy', 'not enough'],                   weight: 2 },
    { terms: ['missing human connection', 'crave connection', 'long for'],         weight: 2 },
    { terms: ['social anxiety', 'can\'t talk to people', 'afraid to reach out'],   weight: 1 },
  ],

  grief: [
    { terms: ['grief', 'grieving', 'grieve', 'bereaved', 'bereavement'],           weight: 3 },
    { terms: ['died', 'dead', 'death', 'passed away', 'passing', 'gone forever'],  weight: 3 },
    { terms: ['funeral', 'burial', 'mourning', 'mourn', 'mourned'],                weight: 3 },
    { terms: ['loss', 'lost someone', 'losing someone', 'someone i lost'],         weight: 3 },
    { terms: ['miss them', 'missing them', 'they\'re gone', 'they died'],          weight: 3 },
    { terms: ['never see them again', 'won\'t come back', 'last time'],            weight: 3 },
    { terms: ['widow', 'widowed', 'orphan', 'orphaned'],                           weight: 3 },
    { terms: ['end of life', 'terminal', 'dying', 'hospice'],                      weight: 2 },
    { terms: ['pet died', 'lost my dog', 'lost my cat', 'lost my pet'],            weight: 2 },
    { terms: ['anniversary of', 'would have been', 'they would be'],               weight: 1 },
  ],

  anger: [
    { terms: ['angry', 'anger', 'furious', 'furiously', 'rage', 'raging'],        weight: 3 },
    { terms: ['hate', 'hating', 'despise', 'loathe', 'detest'],                   weight: 3 },
    { terms: ['frustrated', 'frustration', 'infuriated', 'irritated'],            weight: 2 },
    { terms: ['betrayed', 'betrayal', 'stabbed in the back', 'lied to'],          weight: 3 },
    { terms: ['unfair', 'unjust', 'injustice', 'not right', 'wrong of them'],     weight: 2 },
    { terms: ['annoyed', 'aggravated', 'fed up', 'sick of', 'sick and tired'],    weight: 2 },
    { terms: ['explode', 'snap', 'lose it', 'can\'t take it', 'enough'],          weight: 2 },
    { terms: ['yelled', 'yelling', 'screamed', 'screaming', 'shouted'],           weight: 2 },
    { terms: ['they always', 'they never', 'how dare', 'disrespected'],           weight: 1 },
    { terms: ['revenge', 'get back', 'make them pay'],                             weight: 2 },
  ],

  overwhelm: [
    { terms: ['overwhelmed', 'overwhelm', 'too much', 'can\'t cope', 'drowning'],  weight: 3 },
    { terms: ['buried', 'swamped', 'flooded', 'overloaded', 'maxed out'],          weight: 3 },
    { terms: ['can\'t keep up', 'falling behind', 'impossible', 'unbearable'],     weight: 2 },
    { terms: ['paralyzed', 'frozen', 'stuck', 'can\'t move forward'],              weight: 2 },
    { terms: ['everything at once', 'too many things', 'no end in sight'],         weight: 2 },
    { terms: ['shutdown', 'shut down', 'crashing', 'hitting a wall'],              weight: 3 },
    { terms: ['stretched thin', 'spread too thin', 'running on empty'],            weight: 2 },
    { terms: ['not enough hours', 'never enough time', 'pressure'],                weight: 1 },
    { terms: ['falling apart', 'breaking down', 'unraveling', 'unravelling'],     weight: 3 },
    { terms: ['just surviving', 'barely functioning', 'going through motions'],    weight: 2 },
  ],

  hope: [
    { terms: ['hope', 'hopeful', 'hopefully', 'hoping'],                           weight: 3 },
    { terms: ['optimistic', 'optimism', 'positive', 'positivity'],                 weight: 2 },
    { terms: ['better', 'things will get better', 'it gets better'],               weight: 2 },
    { terms: ['looking forward', 'can\'t wait', 'excited about future'],           weight: 2 },
    { terms: ['trying', 'keep going', 'won\'t give up', 'fighting'],              weight: 2 },
    { terms: ['possibility', 'possibilities', 'potential', 'maybe'],               weight: 1 },
    { terms: ['new beginning', 'fresh start', 'turning point', 'turning corner'],  weight: 3 },
    { terms: ['healing', 'recovering', 'getting there', 'progress'],               weight: 2 },
    { terms: ['believe', 'trust', 'faith', 'know it will', 'it will be okay'],    weight: 1 },
  ],

  calm: [
    { terms: ['calm', 'calmer', 'calmness', 'peaceful', 'at peace'],               weight: 3 },
    { terms: ['serene', 'serenity', 'tranquil', 'tranquility', 'still'],           weight: 3 },
    { terms: ['relaxed', 'relaxing', 'relaxation', 'at ease', 'settled'],          weight: 2 },
    { terms: ['grounded', 'grounding', 'centered', 'centred', 'balanced'],         weight: 2 },
    { terms: ['okay', 'ok', 'fine', 'alright', 'doing okay', 'good enough'],      weight: 1 },
    { terms: ['breathing', 'breath', 'breathe', 'inhale', 'exhale'],              weight: 1 },
    { terms: ['present', 'in the moment', 'mindful', 'here'],                     weight: 1 },
    { terms: ['accepting', 'acceptance', 'let go', 'letting go'],                  weight: 2 },
    { terms: ['content', 'contentment', 'enough', 'satisfied'],                   weight: 2 },
  ],

  burnout: [
    { terms: ['burnout', 'burnt out', 'burned out', 'burning out'],                weight: 3 },
    { terms: ['exhausted', 'exhaustion', 'depleted', 'drained', 'empty'],          weight: 3 },
    { terms: ['no energy', 'zero energy', 'can\'t function', 'can\'t work'],       weight: 3 },
    { terms: ['going through motions', 'detached', 'detachment', 'disconnected'],  weight: 2 },
    { terms: ['cynical', 'cynicism', 'don\'t care anymore', 'stopped caring'],     weight: 2 },
    { terms: ['resentful', 'resentment', 'resent', 'hate my job', 'hate work'],   weight: 2 },
    { terms: ['productivity', 'can\'t produce', 'not performing', 'behind'],       weight: 1 },
    { terms: ['chronic fatigue', 'always tired', 'never rested', 'exhausting'],   weight: 3 },
    { terms: ['automated', 'mechanical', 'zombie', 'on autopilot', 'numb'],       weight: 2 },
    { terms: ['dread monday', 'dread work', 'no motivation', 'apathetic'],        weight: 2 },
  ],
}

// ── Intensifiers and negators ─────────────────────────────────────────────────

export const INTENSIFIERS = [
  { terms: ['so', 'very', 'really', 'extremely', 'incredibly', 'absolutely'], multiplier: 1.4 },
  { terms: ['utterly', 'completely', 'totally', 'deeply', 'profoundly'],      multiplier: 1.6 },
  { terms: ['overwhelmingly', 'unbearably', 'impossibly', 'desperately'],     multiplier: 1.8 },
  { terms: ['a bit', 'slightly', 'kind of', 'sort of', 'a little'],          multiplier: 0.65 },
  { terms: ['not really', 'not too', 'not very'],                             multiplier: 0.4 },
]

export const NEGATORS = [
  'not', 'no', 'never', 'don\'t', 'doesn\'t', 'didn\'t', 'won\'t',
  'can\'t', 'cannot', 'wouldn\'t', 'shouldn\'t', 'hardly', 'barely',
]

// ── Contextual phrase boosters ────────────────────────────────────────────────
// Multi-word phrases that carry strong emotional signal regardless of individual words

export const PHRASE_PATTERNS = [
  { pattern: /i can't do this anymore/i,      emotion: 'overwhelm', boost: 3.5 },
  { pattern: /i give up/i,                    emotion: 'sadness',   boost: 3.0 },
  { pattern: /i don't know what to do/i,      emotion: 'anxiety',   boost: 2.5 },
  { pattern: /no one cares/i,                 emotion: 'loneliness',boost: 3.5 },
  { pattern: /nobody cares/i,                 emotion: 'loneliness',boost: 3.5 },
  { pattern: /i feel so alone/i,              emotion: 'loneliness',boost: 4.0 },
  { pattern: /i'm so tired of/i,              emotion: 'burnout',   boost: 2.5 },
  { pattern: /everything feels heavy/i,       emotion: 'sadness',   boost: 2.5 },
  { pattern: /can't sleep/i,                  emotion: 'anxiety',   boost: 1.5 },
  { pattern: /can't eat/i,                    emotion: 'sadness',   boost: 2.0 },
  { pattern: /i feel empty/i,                 emotion: 'sadness',   boost: 3.0 },
  { pattern: /nothing matters/i,              emotion: 'sadness',   boost: 3.5 },
  { pattern: /what's the point/i,             emotion: 'sadness',   boost: 3.0 },
  { pattern: /i feel stuck/i,                 emotion: 'overwhelm', boost: 2.0 },
  { pattern: /i can't breathe/i,              emotion: 'anxiety',   boost: 3.0 },
  { pattern: /my heart is heavy/i,            emotion: 'sadness',   boost: 3.0 },
  { pattern: /i miss (him|her|them|you)/i,    emotion: 'grief',     boost: 2.5 },
  { pattern: /they('re| are) gone/i,          emotion: 'grief',     boost: 3.5 },
  { pattern: /finally (?:okay|good|better)/i, emotion: 'hope',      boost: 2.5 },
  { pattern: /things are looking up/i,        emotion: 'hope',      boost: 3.0 },
  { pattern: /feel at peace/i,                emotion: 'calm',      boost: 3.0 },
  { pattern: /deep breath/i,                  emotion: 'calm',      boost: 1.5 },
]

// ── Crisis detection signals ──────────────────────────────────────────────────
// High-risk phrases that warrant immediate flagging.
// Tiered: tier 1 = explicit, tier 2 = strong ideation, tier 3 = indirect signals

export const CRISIS_SIGNALS = {
  tier1: [
    /\bsuicid(?:e|al|ally)\b/i,
    /\bkill (?:my)?self\b/i,
    /\bend (?:my|this) life\b/i,
    /\bwant to die\b/i,
    /\bwish i (?:was|were) dead\b/i,
    /\bnot (?:want|wanting) to (?:be )?alive\b/i,
    /\bself.?harm\b/i,
    /\bself.?hurt\b/i,
    /\bcut (?:my)?self\b/i,
    /\bcutting (?:my)?self\b/i,
    /\bself.?injur/i,
    /\boverdos(?:e|ing)\b/i,
    /\btake my (?:own )?life\b/i,
  ],
  tier2: [
    /\bcan't go on\b/i,
    /\bno (?:reason|point|purpose) to (?:live|be here|continue)\b/i,
    /\bdon't (?:want|care) to (?:be )?(?:here|alive) anymore\b/i,
    /\bbetter off (?:without me|if i (?:was|were) gone|dead)\b/i,
    /\bno (?:way|reason) out\b/i,
    /\bfeel like (?:a )?burden\b/i,
    /\beveryone (?:would )?be better (?:off )?without me\b/i,
    /\bsaying goodbye\b/i,
    /\bgiving (?:things|stuff|everything) away\b/i,
    /\bfinal(?:ly |ly)(?:at )?peace\b/i,
  ],
  tier3: [
    /\bgoodbye (?:everyone|world|cruel world)\b/i,
    /\bcan't (?:keep )?fighting (?:this|anymore)\b/i,
    /\btoo (?:much pain|tired to continue|exhausted to go on)\b/i,
    /\bif i (?:wasn't|weren't) here\b/i,
    /\bwhat's the point (?:of )?(?:going on|continuing|living|trying)\b/i,
  ],
}

// ── Mood-to-emotion bridge ────────────────────────────────────────────────────
// Maps mood tracker values to emotion classification

export const MOOD_EMOTION_MAP = {
  radiant:  'joy',
  content:  'calm',
  tender:   'sadness',
  hopeful:  'hope',
  drifting: 'sadness',
  anxious:  'anxiety',
  heavy:    'sadness',
  restless: 'anxiety',
  hollow:   'sadness',
  // journal mood tags
  calm:     'calm',
  grateful: 'joy',
  'at-peace': 'calm',
}

// ── Emotion valence (positive / negative / neutral) ───────────────────────────
export const EMOTION_VALENCE = {
  joy:       'positive',
  hope:      'positive',
  calm:      'positive',
  sadness:   'negative',
  anxiety:   'negative',
  loneliness:'negative',
  grief:     'negative',
  anger:     'negative',
  overwhelm: 'negative',
  burnout:   'negative',
}

// ── Response register map (used by updated mockResponder) ─────────────────────
export const EMOTION_TO_REGISTER = {
  joy:       'joy',
  hope:      'joy',
  calm:      'neutral',
  sadness:   'sadness',
  anxiety:   'anxiety',
  loneliness:'loneliness',
  grief:     'grief',
  anger:     'anger',
  overwhelm: 'overwhelm',
  burnout:   'burnout',
}