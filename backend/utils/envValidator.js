// =============================================
// Sable — Environment Variable Validator
// Validates required env vars at startup and
// fails fast with a clear, actionable error
// rather than crashing later with a cryptic
// runtime failure deep in some unrelated module.
// =============================================

// ── Variable definitions ──────────────────────────────────────────────────────
// Each entry describes how to validate a single environment variable.
//
//   required:  if true, app startup fails when absent/empty
//   validate:  optional custom validator, returns an error string or null
//   sensitive: if true, the value itself is never echoed in logs/errors
//   default:   if set, the variable is optional and this value is used
//              when absent (informational only — does not mutate process.env)

const ENV_SCHEMA = {
  MONGO_URI: {
    required:  true,
    sensitive: true,
    validate: (value) =>
      /^mongodb(\+srv)?:\/\//.test(value)
        ? null
        : 'must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)',
  },

  JWT_SECRET: {
    required:  true,
    sensitive: true,
    validate: (value) =>
      value.length >= 32
        ? null
        : 'must be at least 32 characters long for adequate signing security',
  },

  JWT_EXPIRES_IN: {
    required: false,
    default:  '30d',
    validate: (value) =>
      /^\d+[smhdy]$/.test(value)
        ? null
        : 'must be a duration string like "30d", "12h", "60m"',
  },

  PORT: {
    required: false,
    default:  '4000',
    validate: (value) => {
      const n = Number(value)
      return Number.isInteger(n) && n > 0 && n < 65536
        ? null
        : 'must be a valid port number between 1 and 65535'
    },
  },

  CLIENT_ORIGIN: {
    required: false,
    default:  'http://localhost:5173',
    validate: (value) =>
      /^https?:\/\/.+/.test(value)
        ? null
        : 'must be a valid URL including protocol (e.g. https://example.com)',
  },

  ANTHROPIC_API_KEY: {
    required:  true,
    sensitive: true,
    validate: (value) =>
      value.startsWith('sk-ant-')
        ? null
        : 'must be a valid Anthropic API key (starts with "sk-ant-")',
  },

  CLAUDE_MODEL: {
    required: false,
    default:  'claude-sonnet-4-6',
  },

  NODE_ENV: {
    required: false,
    default:  'development',
    validate: (value) =>
      ['development', 'production', 'test'].includes(value)
        ? null
        : 'must be one of: development, production, test',
  },

  LOG_LEVEL: {
    required: false,
    default:  'info',
    validate: (value) =>
      ['debug', 'info', 'warn', 'error'].includes(value)
        ? null
        : 'must be one of: debug, info, warn, error',
  },
}

// ── Validation result types ───────────────────────────────────────────────────

class EnvValidationError extends Error {
  constructor(issues) {
    const summary = issues.map((i) => `  - ${i.key}: ${i.message}`).join('\n')
    super(`Environment validation failed:\n${summary}`)
    this.name   = 'EnvValidationError'
    this.issues = issues
  }
}

// ── Core validation ────────────────────────────────────────────────────────────

/**
 * Validate process.env against ENV_SCHEMA (or a custom schema override).
 * Does NOT mutate process.env — defaults are informational only and
 * should be applied by the caller (e.g. `process.env.PORT ??= '4000'`)
 * if desired.
 *
 * @param {Record<string, object>} [schema] — defaults to ENV_SCHEMA
 * @param {Record<string, string | undefined>} [source] — defaults to process.env
 * @returns {{ valid: boolean, issues: Array<{ key: string, message: string }> }}
 */
export function validateEnv(schema = ENV_SCHEMA, source = process.env) {
  const issues = []

  for (const [key, rule] of Object.entries(schema)) {
    const rawValue = source[key]
    const present  = rawValue !== undefined && rawValue !== ''

    if (!present) {
      if (rule.required) {
        issues.push({ key, message: 'is required but not set' })
      }
      // Optional + absent: nothing further to check (default applies conceptually)
      continue
    }

    if (rule.validate) {
      const error = rule.validate(rawValue)
      if (error) issues.push({ key, message: error })
    }
  }

  return { valid: issues.length === 0, issues }
}

/**
 * Validate process.env and throw EnvValidationError if invalid.
 * Intended to be called once at application startup, before any
 * other module that depends on these variables is initialised.
 *
 * @param {Record<string, object>} [schema]
 * @param {Record<string, string | undefined>} [source]
 * @throws {EnvValidationError}
 */
export function assertValidEnv(schema = ENV_SCHEMA, source = process.env) {
  const result = validateEnv(schema, source)
  if (!result.valid) {
    throw new EnvValidationError(result.issues)
  }
}

/**
 * Validate process.env and, if invalid, print a clear error report to
 * stderr and exit the process immediately (exit code 1). This is the
 * primary entry point for use at the top of server.js — it guarantees
 * the app never starts in a half-configured state.
 *
 * @param {{
 *   schema?: Record<string, object>,
 *   source?: Record<string, string | undefined>,
 *   exitOnFailure?: boolean, // default true; set false in tests
 * }} [options]
 * @returns {{ valid: boolean, issues: Array<{ key: string, message: string }> }}
 */
export function validateEnvOrExit({
  schema = ENV_SCHEMA,
  source = process.env,
  exitOnFailure = true,
} = {}) {
  const result = validateEnv(schema, source)

  if (!result.valid) {
    console.error('\n❌  Sable failed to start: invalid environment configuration.\n')
    for (const issue of result.issues) {
      console.error(`   • ${issue.key}: ${issue.message}`)
    }
    console.error('\n   Check your .env file against .env.example and try again.\n')

    if (exitOnFailure) {
      process.exit(1)
    }
  } else {
    console.log('✓  Environment configuration validated.')
  }

  return result
}

/**
 * Returns a safe-to-log snapshot of the current environment configuration,
 * with sensitive values masked. Useful for a one-time startup log line
 * confirming what was loaded without exposing secrets.
 *
 * @param {Record<string, object>} [schema]
 * @param {Record<string, string | undefined>} [source]
 * @returns {Record<string, string>}
 */
export function getSafeEnvSnapshot(schema = ENV_SCHEMA, source = process.env) {
  const snapshot = {}
  for (const [key, rule] of Object.entries(schema)) {
    const rawValue = source[key]
    const present  = rawValue !== undefined && rawValue !== ''

    if (!present) {
      snapshot[key] = rule.default !== undefined ? `${rule.default} (default)` : '(not set)'
      continue
    }

    snapshot[key] = rule.sensitive
      ? maskSecret(rawValue)
      : rawValue
  }
  return snapshot
}

function maskSecret(value) {
  if (value.length <= 8) return '****'
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

export { ENV_SCHEMA, EnvValidationError }