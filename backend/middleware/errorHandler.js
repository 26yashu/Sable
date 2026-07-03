// =============================================
// Sable — Global Error Handler Middleware
// Centralised error handling for all routes.
// Maps known error types (Mongoose validation,
// cast errors, JWT errors, custom app errors)
// to consistent, safe API responses.
// =============================================

// ── Custom application error ─────────────────────────────────────────────────

/**
 * AppError — throw this from controllers/services for intentional,
 * well-formed error responses (e.g. "not found", "forbidden").
 *
 * @example
 * throw new AppError('Entry not found.', 404)
 */
export class AppError extends Error {
  constructor(message, status = 500, details) {
    super(message)
    this.name    = 'AppError'
    this.status  = status
    this.details = details
  }
}

// ── 404 handler ───────────────────────────────────────────────────────────────
// Mount this AFTER all routes, BEFORE the error handler, to catch
// any request that didn't match a defined route.

export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: `No route found for ${req.method} ${req.originalUrl}`,
  })
}

// ── Error shape normalisation ─────────────────────────────────────────────────

/**
 * Translate a raw error (from Mongoose, JWT, our own AppError/ValidationError,
 * or anything unexpected) into a consistent { status, body } response shape.
 * Never leaks stack traces or internal details to the client.
 */
function normaliseError(err) {
  // Our own validation middleware (middleware/validateRequest.js)
  if (err.name === 'ValidationError' && Array.isArray(err.issues)) {
    return {
      status: err.status ?? 400,
      body: {
        error:  'Validation failed.',
        issues: err.issues,
      },
    }
  }

  // Mongoose schema validation errors
  if (err.name === 'ValidationError' && err.errors) {
    const issues = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }))
    return {
      status: 400,
      body:   { error: 'Validation failed.', issues },
    }
  }

  // Mongoose invalid ObjectId / cast errors
  if (err.name === 'CastError') {
    return {
      status: 400,
      body:   { error: `Invalid value for field "${err.path}".` },
    }
  }

  // Mongoose duplicate key (unique index violation)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'field'
    return {
      status: 409,
      body:   { error: `A record with this ${field} already exists.` },
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return { status: 401, body: { error: 'Invalid authentication token.' } }
  }
  if (err.name === 'TokenExpiredError') {
    return { status: 401, body: { error: 'Authentication token has expired.' } }
  }

  // Malformed JSON body (express.json() parse failure)
  if (err.type === 'entity.parse.failed') {
    return { status: 400, body: { error: 'Malformed JSON in request body.' } }
  }

  // Body too large
  if (err.type === 'entity.too.large') {
    return { status: 413, body: { error: 'Request payload is too large.' } }
  }

  // Anthropic SDK errors — never leak provider-specific detail to the client
  if (err.name === 'APIError' || err.constructor?.name?.includes('Anthropic')) {
    return { status: 502, body: { error: 'The companion is briefly unavailable. Please try again.' } }
  }

  // Our own AppError, or anything with an explicit .status already set
  if (typeof err.status === 'number') {
    return { status: err.status, body: { error: err.message ?? 'Request failed.' } }
  }

  // Unknown / unexpected — never leak the raw message or stack to the client
  return { status: 500, body: { error: 'Internal server error.' } }
}

// ── Global error-handling middleware ─────────────────────────────────────────
// Must be registered LAST, after all routes and the 404 handler.
// Express recognises this as an error handler by its 4-argument signature.

export function errorHandler(err, req, res, _next) {
  const { status, body } = normaliseError(err)

  // Log full detail server-side regardless of what we expose to the client.
  // 5xx gets logged as an error; 4xx as a warning (expected client mistakes).
  const logPayload = {
    method: req.method,
    path:   req.originalUrl,
    status,
    message: err.message,
  }

  if (status >= 500) {
    console.error('[sable-api] Unhandled error:', logPayload, err.stack)
  } else {
    console.warn('[sable-api] Request error:', logPayload)
  }

  if (res.headersSent) {
    // A response has already started streaming — delegate to Express's
    // default handler rather than attempting to send a second response.
    return _next(err)
  }

  res.status(status).json(body)
}

// ── Async route wrapper ───────────────────────────────────────────────────────

/**
 * Wraps an async route handler so thrown/rejected errors are forwarded
 * to next() automatically, without requiring try/catch in every controller.
 *
 * @example
 * router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}