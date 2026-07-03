import mongoose from 'mongoose'

const journalEntrySchema = new mongoose.Schema(
  {
    // Real user _id (as string) or anonymous UUID
    ownerId: {
      type:     String,
      required: true,
      index:    true,
    },

    ownerType: {
      type:    String,
      enum:    ['anonymous', 'user'],
      required: true,
    },

    title: {
      type:      String,
      default:   '',
      maxlength: 200,
      trim:      true,
    },

    content: {
      type:     String,
      required: [true, 'Entry content is required'],
      maxlength: 50000,
      trim:     true,
    },

    moodTag: {
      type: String,
      enum: [
        'calm', 'grateful', 'anxious', 'heavy',
        'hopeful', 'tender', 'restless', 'at-peace',
        'radiant', 'drifting', 'hollow', null,
      ],
      default: null,
    },

    // Soft-delete: hide from UI without destroying data
    deletedAt: {
      type:    Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
  }
)

journalEntrySchema.index({ ownerId: 1, createdAt: -1 })
journalEntrySchema.index({ ownerId: 1, moodTag: 1 })

// Never expose deleted entries through standard queries
journalEntrySchema.pre('find', function () {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null })
  }
})
journalEntrySchema.pre('findOne', function () {
  if (!this.getQuery().deletedAt) {
    this.where({ deletedAt: null })
  }
})

journalEntrySchema.methods.toSafeObject = function () {
  return {
    id:        this._id,
    title:     this.title,
    content:   this.content,
    moodTag:   this.moodTag,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

export default mongoose.model('JournalEntry', journalEntrySchema)