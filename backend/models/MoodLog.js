import mongoose from 'mongoose'

const VALID_MOODS = [
  'radiant', 'content', 'tender', 'hopeful',
  'drifting', 'anxious', 'heavy', 'restless', 'hollow',
]

const moodLogSchema = new mongoose.Schema(
  {
    ownerId: {
      type:     String,
      required: true,
      index:    true,
    },

    ownerType: {
      type:     String,
      enum:     ['anonymous', 'user'],
      required: true,
    },

    mood: {
      type:     String,
      enum:     VALID_MOODS,
      required: true,
    },

    // 1 – 10
    intensity: {
      type:    Number,
      min:     1,
      max:     10,
      required: true,
      default: 5,
    },

    // PRIVACY: note is never forwarded to any AI system
    note: {
      type:      String,
      default:   '',
      maxlength: 1000,
      trim:      true,
    },
  },
  {
    timestamps: true,
  }
)

moodLogSchema.index({ ownerId: 1, createdAt: -1 })

moodLogSchema.methods.toSafeObject = function () {
  return {
    id:        this._id,
    mood:      this.mood,
    intensity: this.intensity,
    note:      this.note,
    createdAt: this.createdAt,
  }
}

export default mongoose.model('MoodLog', moodLogSchema)