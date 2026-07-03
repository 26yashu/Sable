import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema(
  {
    // Either a real user _id or an anonymous session UUID string
    ownerId: {
      type:     String,
      required: true,
      index:    true,
    },

    // 'anonymous' | 'user' (authenticated)
    ownerType: {
      type:     String,
      enum:     ['anonymous', 'user'],
      required: true,
    },

    // 'user' = sent by the human | 'companion' = sent by Sable
    role: {
      type:     String,
      enum:     ['user', 'companion'],
      required: true,
    },

    content: {
      type:      String,
      required:  true,
      maxlength: 4000,
      trim:      true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
)

// Compound index for efficient history queries
messageSchema.index({ ownerId: 1, createdAt: -1 })

export default mongoose.model('Message', messageSchema)