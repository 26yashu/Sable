import mongoose from 'mongoose'

// ── Reminder types ─────────────────────────────────────────────────────────────
const REMINDER_TYPES = ['daily', 'weeklyReflection', 'moodCheckIn']

// Days of week for weekly reminders (0 = Sunday … 6 = Saturday)
const VALID_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]

const reminderSchema = new mongoose.Schema(
  {
    // Real user _id (as string) or anonymous UUID — mirrors other models
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

    type: {
      type:     String,
      enum:     REMINDER_TYPES,
      required: true,
    },

    // Whether this reminder is currently active
    enabled: {
      type:    Boolean,
      default: true,
    },

    // 24-hour "HH:mm" local time string, e.g. "09:00", "20:30"
    // Interpretation is client-local; the server stores the raw preference.
    timeOfDay: {
      type:     String,
      required: true,
      default:  '09:00',
      match:    [/^([01]\d|2[0-3]):([0-5]\d)$/, 'timeOfDay must be in HH:mm 24-hour format'],
    },

    // For 'weeklyReflection' only — which day of the week it fires.
    // Ignored for 'daily' and 'moodCheckIn'.
    dayOfWeek: {
      type:    Number,
      enum:    VALID_WEEKDAYS,
      default: 0, // Sunday — natural "look back on your week" day
    },

    // IANA timezone string, e.g. "America/New_York". Used to resolve
    // timeOfDay into an absolute next-fire instant.
    timezone: {
      type:    String,
      default: 'UTC',
      trim:    true,
    },

    // Free-form label shown in the UI, optional override of the default copy
    label: {
      type:      String,
      default:   '',
      maxlength: 120,
      trim:      true,
    },

    // Last time this reminder actually fired (for dedupe / "already sent today")
    lastTriggeredAt: {
      type:    Date,
      default: null,
    },

    // Computed next-fire instant, maintained by reminderService
    nextTriggerAt: {
      type:    Date,
      default: null,
      index:   true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
)

// One reminder per (owner, type) — toggling is an update, not a new doc,
// except weeklyReflection where dayOfWeek differentiates configurations.
reminderSchema.index({ ownerId: 1, type: 1 }, { unique: true })
reminderSchema.index({ enabled: 1, nextTriggerAt: 1 })

reminderSchema.methods.toSafeObject = function () {
  return {
    id:              this._id,
    type:            this.type,
    enabled:         this.enabled,
    timeOfDay:       this.timeOfDay,
    dayOfWeek:       this.dayOfWeek,
    timezone:        this.timezone,
    label:           this.label,
    lastTriggeredAt: this.lastTriggeredAt,
    nextTriggerAt:   this.nextTriggerAt,
    createdAt:       this.createdAt,
    updatedAt:       this.updatedAt,
  }
}

export const REMINDER_TYPE_VALUES = REMINDER_TYPES
export default mongoose.model('Reminder', reminderSchema)