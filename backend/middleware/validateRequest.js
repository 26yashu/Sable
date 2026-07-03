// =============================================
// Sable — Request Validation Middleware
// Declarative schema-based validation for
// req.body / req.query / req.params.
// No external dependencies required.
// =============================================

// ── Validation error ───────────────────────────────────────────────────────────

class ValidationError extends Error {
  constructor(issues) {
    super('Validation failed')
    this.status = 400
    this.issues = issues // Array<{ field: string, message: string }>
  }
}

// ── Field rule evaluators ────────────────────────────────────────────────────

function isPresent(value) {
  return value !== undefined && value !== null && value !== ''
}

function typeMatches(value, type) {
  switch (type) {
    case 'string':  return typeof value === 'string'
    case 'number':  return typeof value === 'number' && !Number.isNaN(value)
    case 'boolean': return typeof value === 'boolean'
    case 'array':   return Array.isArray(value)
    case 'object':  return typeof value === 'object' && value !== null && !Array.isArray(value)
    default:        return true
  }
}

/**
 * Validate a single field against its rule definition.
 * Returns an array of issue strings (empty if valid).
 *
 * @param {string} field
 * @param {unknown} value
 * @param {{
 *   required?: boolean,
 *   type?: 'string' | 'number' | 'boolean' | 'array' | 'object',
 *   minLength?: number,
 *   maxLength?: number,
 *   min?: number,
 *   max?: number,
 *   pattern?: RegExp,
 *   enum?: Array<unknown>,
 *   custom?: (value: unknown) => string | null, // return error message or null
 * }} rule
 * @returns {string[]}
 */
function validateField(field, value, rule) {
  const issues = []
  const present = isPresent(value)

  if (rule.required && !present) {
    issues.push(`${field} is required.`)
    return issues // no point checking further rules on a missing value
  }

  if (!present) return issues // optional and absent — nothing more to check

  if (rule.type && !typeMatches(value, rule.type)) {
    issues.push(`${field} must be of type ${rule.type}.`)
    return issues // type mismatch makes further checks unreliable
  }

  if (rule.type === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      issues.push(`${field} must be at least ${rule.minLength} characters.`)
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      issues.push(`${field} must be at most ${rule.maxLength} characters.`)
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      issues.push(`${field} is not in a valid format.`)
    }
  }

  if (rule.type === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      issues.push(`${field} must be at least ${rule.min}.`)
    }
    if (rule.max !== undefined && value > rule.max) {
      issues.push(`${field} must be at most ${rule.max}.`)
    }
  }

  if (rule.type === 'array') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      issues.push(`${field} must contain at least ${rule.minLength} item(s).`)
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      issues.push(`${field} must contain at most ${rule.maxLength} item(s).`)
    }
  }

  if (rule.enum && !rule.enum.includes(value)) {
    issues.push(`${field} must be one of: ${rule.enum.join(', ')}.`)
  }

  if (rule.custom) {
    const customError = rule.custom(value)
    if (customError) issues.push(customError)
  }

  return issues
}

// ── Schema validator ──────────────────────────────────────────────────────────

/**
 * Validate a plain object against a field-rule schema.
 * @param {Record<string, unknown>} data
 * @param {Record<string, object>} schema
 * @returns {{ field: string, message: string }[]}
 */
function validateAgainstSchema(data, schema) {
  const issues = []
  for (const [field, rule] of Object.entries(schema)) {
    const fieldIssues = validateField(field, data?.[field], rule)
    for (const message of fieldIssues) {
      issues.push({ field, message })
    }
  }
  return issues
}

// ── Public middleware factory ────────────────────────────────────────────────

/**
 * Create an Express middleware that validates req.body, req.query,
 * and/or req.params against the provided schemas. Any failure produces
 * a single 400 response listing all issues (does not short-circuit
 * after the first failure — the caller sees everything at once).
 *
 * @param {{
 *   body?:   Record<string, object>,
 *   query?:  Record<string, object>,
 *   params?: Record<string, object>,
 * }} schemas
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.post('/', validateRequest({
 *   body: {
 *     message: { required: true, type: 'string', minLength: 1, maxLength: 4000 },
 *   },
 * }), sendMessage)
 */
export function validateRequest(schemas = {}) {
  return function validationMiddleware(req, res, next) {
    const issues = [
      ...(schemas.body   ? validateAgainstSchema(req.body,   schemas.body)   : []),
      ...(schemas.query  ? validateAgainstSchema(req.query,  schemas.query)  : []),
      ...(schemas.params ? validateAgainstSchema(req.params, schemas.params) : []),
    ]

    if (issues.length > 0) {
      return next(new ValidationError(issues))
    }

    next()
  }
}

// ── Shared reusable schema fragments ─────────────────────────────────────────
// Common field shapes used across multiple Sable routes — import these
// into route-specific schemas to avoid repetition and keep validation
// rules consistent for shared concepts like mood/intensity.

export const commonRules = {
  email: {
    required:  true,
    type:      'string',
    maxLength: 254,
    pattern:   /^\S+@\S+\.\S+$/,
  },
  password: {
    required:  true,
    type:      'string',
    minLength: 8,
    maxLength: 128,
  },
  mongoId: {
    required: true,
    type:     'string',
    pattern:  /^[a-f0-9]{24}$/i,
  },
  intensity: {
    required: false,
    type:     'number',
    min:      1,
    max:      10,
  },
  shortText: {
    required:  false,
    type:      'string',
    maxLength: 200,
  },
  longText: {
    required:  false,
    type:      'string',
    maxLength: 50_000,
  },
}

export { ValidationError }