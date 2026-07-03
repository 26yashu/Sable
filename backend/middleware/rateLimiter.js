// =============================================
// Sable — Rate Limiter Middleware
// In-memory sliding-window rate limiter.
// No external dependencies required.
//
// NOTE: This implementation is per-process memory.
// For horizontally-scaled deployments (multiple Node
// instances behind a load balancer), back this with
// Redis or another shared store instead of the Map
// below — the public API (limiter factory + key
// resolution) is designed to make that swap localised
// to `store.js`-style module if needed later.
// =============================================

// ── In-memory store ────────────────────────────────────────────────────────────
// Map<key, { count: number, windowStart: number }>

const buckets = new Map()

// Periodic sweep to prevent unbounded memory growth from stale keys.
// Runs independently of any single request.
const SWEEP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
let sweepTimer = null

function startSweeper(maxWindowMs) {
  if (sweepTimer) return
  sweepTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.windowStart > maxWindowMs) {
        buckets.delete(key)
      }
    }
  }, SWEEP_INTERVAL_MS)
  // Don't keep the process alive solely for this timer
  sweepTimer.unref?.()
}

// ── Key resolution ────────────────────────────────────────────────────────────

/**
 * Default key resolver: prefers an authenticated user id, falls back to
 * the anonymous session id header, falls back to remote IP. This keeps
 * rate limits meaningful per-identity rather than per-NAT'd IP block
 * when an identity is available.
 */
function defaultKeyResolver(req) {
  if (req.user?._id) return `user:${req.user._id}`
  const anonId = req.headers['x-anon-id']
  if (anonId) return `anon:${anonId}`
  return `ip:${req.ip}`
}

// ── Core limiter factory ──────────────────────────────────────────────────────

/**
 * Create a rate-limiting middleware.
 *
 * @param {{
 *   windowMs?: number,        // sliding window size in ms (default 60_000)
 *   max?: number,             // max requests per window (default 60)
 *   keyResolver?: (req) => string,
 *   message?: string,         // error message on limit exceeded
 *   skip?: (req) => boolean,  // optional bypass predicate
 * }} options
 * @returns {import('express').RequestHandler}
 */
export function createRateLimiter({
  windowMs    = 60_000,
  max         = 60,
  keyResolver = defaultKeyResolver,
  message     = 'Too many requests. Please slow down and try again shortly.',
  skip,
} = {}) {
  startSweeper(windowMs)

  return function rateLimiter(req, res, next) {
    if (skip?.(req)) return next()

    const key = keyResolver(req)
    const now = Date.now()

    let bucket = buckets.get(key)

    // No bucket yet, or the window has fully elapsed — start fresh
    if (!bucket || now - bucket.windowStart >= windowMs) {
      bucket = { count: 0, windowStart: now }
      buckets.set(key, bucket)
    }

    bucket.count += 1

    const remaining   = Math.max(0, max - bucket.count)
    const resetInMs    = windowMs - (now - bucket.windowStart)
    const resetSeconds = Math.ceil(resetInMs / 1000)

    res.set('X-RateLimit-Limit',     String(max))
    res.set('X-RateLimit-Remaining', String(remaining))
    res.set('X-RateLimit-Reset',     String(resetSeconds))

    if (bucket.count > max) {
      res.set('Retry-After', String(resetSeconds))
      return res.status(429).json({
        error:      message,
        retryAfter: resetSeconds,
      })
    }

    next()
  }
}

// ── Pre-configured limiters for common route classes ───────────────────────────

/**
 * General-purpose API limiter — applied globally as a baseline.
 * Generous enough not to interfere with normal usage patterns.
 */
export const apiLimiter = createRateLimiter({
  windowMs: 60_000,
  max:      120,
  message:  'Too many requests. Please slow down and try again shortly.',
})

/**
 * Auth endpoints (signup/login) — tighter limit to slow down
 * credential-stuffing and brute-force attempts.
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60_000, // 15 minutes
  max:      10,
  message:  'Too many authentication attempts. Please wait a few minutes and try again.',
  // Auth requests have no req.user yet, so key by IP plus the attempted
  // email if present, to avoid one shared IP locking out unrelated users
  // while still slowing down attacks against a single account.
  keyResolver: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : ''
    return email ? `auth:${req.ip}:${email}` : `auth:${req.ip}`
  },
})

/**
 * Chat endpoint — moderate limit. Each message triggers emotion
 * classification and potentially a Claude API call, so this protects
 * both cost and abuse vectors.
 */
export const chatLimiter = createRateLimiter({
  windowMs: 60_000,
  max:      20,
  message:  "Let's slow down a little — please wait a moment before sending another message.",
})

/**
 * Write-heavy endpoints (journal, mood logging) — moderate limit,
 * generous enough for legitimate rapid journaling sessions.
 */
export const writeLimiter = createRateLimiter({
  windowMs: 60_000,
  max:      40,
  message:  'Too many requests. Please slow down and try again shortly.',
})

// ── Test/utility helper ──────────────────────────────────────────────────────

/**
 * Clears all rate-limit state. Intended for test suites only.
 */
export function _resetRateLimiterState() {
  buckets.clear()
}