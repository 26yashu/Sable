// =============================================
// Sable — Structured Logger
// Dependency-free structured logging.
// Emits single-line JSON in production for easy
// ingestion by log aggregators (CloudWatch, Datadog,
// etc.), and human-readable colourised output in
// development.
//
// PRIVACY: this logger never logs raw user content
// (messages, journal text, mood notes). Callers must
// pass only derived/safe fields — see redactKnownPII
// below for a last-line-of-defence scrub.
// =============================================

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }

const ENV          = process.env.NODE_ENV ?? 'development'
const IS_PROD      = ENV === 'production'
const CONFIGURED_LEVEL = process.env.LOG_LEVEL ?? (IS_PROD ? 'info' : 'debug')
const MIN_LEVEL     = LEVELS[CONFIGURED_LEVEL] ?? LEVELS.info

// ── ANSI colours for development output ───────────────────────────────────────

const COLOURS = {
  debug: '\x1b[90m', // grey
  info:  '\x1b[36m', // cyan
  warn:  '\x1b[33m', // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
}

// ── Last-line-of-defence PII scrub ────────────────────────────────────────────
// Loggers should never receive raw user content in the first place, but
// this provides a safety net against accidental inclusion of obvious PII
// patterns in log metadata (e.g. an email accidentally passed in context).

const PII_PATTERNS = [
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, // email
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,                 // phone-like
  /\b\d{3}-\d{2}-\d{4}\b/g,                              // SSN-like
]

function redactKnownPII(value) {
  if (typeof value !== 'string') return value
  let result = value
  for (const pattern of PII_PATTERNS) {
    result = result.replace(pattern, '[redacted]')
  }
  return result
}

function deepRedact(obj, depth = 0) {
  if (depth > 5) return obj // guard against pathological nesting
  if (typeof obj === 'string') return redactKnownPII(obj)
  if (Array.isArray(obj)) return obj.map((v) => deepRedact(v, depth + 1))
  if (obj && typeof obj === 'object') {
    const result = {}
    for (const [k, v] of Object.entries(obj)) {
      // Hard-block known-sensitive field names outright, regardless of content
      if (BLOCKED_LOG_FIELDS.has(k)) {
        result[k] = '[omitted]'
        continue
      }
      result[k] = deepRedact(v, depth + 1)
    }
    return result
  }
  return obj
}

const BLOCKED_LOG_FIELDS = new Set([
  'password', 'hashedPassword', 'token', 'jwt',
  'journalContent', 'journalText', 'entryContent', 'rawContent',
  'note', 'noteText', 'moodNote', 'message', 'content',
])

// ── Core emit ──────────────────────────────────────────────────────────────────

function emit(level, message, context = {}) {
  if (LEVELS[level] < MIN_LEVEL) return

  const safeContext = deepRedact(context)
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service:   'sable-api',
    message,
    ...safeContext,
  }

  if (IS_PROD) {
    // Single-line JSON — ready for log aggregators
    const out = level === 'error' ? console.error : console.log
    out(JSON.stringify(entry))
    return
  }

  // Human-readable development output
  const colour = COLOURS[level] ?? ''
  const reset  = COLOURS.reset
  const ctxStr = Object.keys(safeContext).length
    ? ' ' + JSON.stringify(safeContext)
    : ''
  const line = `${colour}[${entry.timestamp}] ${level.toUpperCase().padEnd(5)}${reset} ${message}${ctxStr}`

  const out = level === 'error' ? console.error : console.log
  out(line)
}

// ── Public logger API ─────────────────────────────────────────────────────────

export const logger = {
  debug: (message, context) => emit('debug', message, context),
  info:  (message, context) => emit('info',  message, context),
  warn:  (message, context) => emit('warn',  message, context),
  error: (message, context) => emit('error', message, context),

  /**
   * Returns a child logger that automatically merges `boundContext`
   * into every call. Useful for attaching a request id or ownerId
   * (never raw content) across a request lifecycle.
   *
   * @example
   * const log = logger.child({ requestId: req.id })
   * log.info('Chat message received', { ownerType: owner.ownerType })
   */
  child(boundContext = {}) {
    return {
      debug: (message, context) => emit('debug', message, { ...boundContext, ...context }),
      info:  (message, context) => emit('info',  message, { ...boundContext, ...context }),
      warn:  (message, context) => emit('warn',  message, { ...boundContext, ...context }),
      error: (message, context) => emit('error', message, { ...boundContext, ...context }),
      child: (extra) => logger.child({ ...boundContext, ...extra }),
    }
  },
}

// ── Express request logging middleware ────────────────────────────────────────

/**
 * Lightweight request logger middleware. Logs method, path, status,
 * and duration for every request. Attaches a short correlation id to
 * req.id so downstream handlers can include it via logger.child({ requestId: req.id }).
 *
 * Never logs request bodies, query strings with potential PII, or headers
 * beyond what's needed for correlation.
 */
export function requestLogger() {
  return function logRequest(req, res, next) {
    const start = process.hrtime.bigint()
    req.id = generateRequestId()

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'

      emit(level, 'HTTP request', {
        requestId:  req.id,
        method:     req.method,
        path:       req.path, // path only, never full URL (avoids query-string PII)
        status:     res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      })
    })

    next()
  }
}

function generateRequestId() {
  return Math.random().toString(36).slice(2, 10)
}