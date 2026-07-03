import mongoose from 'mongoose'
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

const userSchema = new mongoose.Schema(
  {
    email: {
      type:     String,
      required: [true, 'Email is required'],
      unique:   true,
      lowercase: true,
      trim:     true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },

    hashedPassword: {
      type:     String,
      required: true,
      select:   false, // never returned in queries unless explicitly requested
    },

    displayName: {
      type:    String,
      default: '',
      trim:    true,
      maxlength: 60,
    },

    companionName: {
      type:    String,
      default: 'Sable',
      trim:    true,
      maxlength: 40,
    },

    // Anonymous session UUIDs that belong to this account.
    // Populated on signup (upgrade) and can grow over time.
    anonymousSessionIds: {
      type:    [String],
      default: [],
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt
  }
)

// ── Instance method: verify a plain-text password ─────────────────────────────
userSchema.methods.verifyPassword = async function (plainText) {
  return bcrypt.compare(plainText, this.hashedPassword)
}

// ── Static helper: hash a plain-text password ─────────────────────────────────
userSchema.statics.hashPassword = async function (plainText) {
  return bcrypt.hash(plainText, SALT_ROUNDS)
}

// ── Safe serialisation (strip hashedPassword from JSON output) ────────────────
userSchema.methods.toSafeObject = function () {
  return {
    id:                  this._id,
    email:               this.email,
    displayName:         this.displayName,
    companionName:       this.companionName,
    anonymousSessionIds: this.anonymousSessionIds,
    createdAt:           this.createdAt,
  }
}

export default mongoose.model('User', userSchema)