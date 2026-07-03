// =============================================
// Sable — Security Headers Middleware
// Dependency-free equivalent of common Helmet
// protections, tuned for a JSON API serving an
// emotionally sensitive product. No inline HTML
// is served by this API, so CSP is strict.
// =============================================

/**
 * Apply a baseline set of security headers to every response.
 * Safe defaults for a same-origin JSON API behind CORS.
 *
 * @param {{
 *   enableHSTS?: boolean,        // set to true only when served over HTTPS in production
 *   hstsMaxAge?: number,         // seconds, default 1 year
 *   frameAncestors?: string,     // CSP frame-ancestors directive, default 'none'
 * }} options
 * @returns {import('express').RequestHandler}
 */
export function securityHeaders({
  enableHSTS    = process.env.NODE_ENV === 'production',
  hstsMaxAge    = 31_536_000, // 1 year
  frameAncestors = "'none'",
} = {}) {
  return function applySecurityHeaders(req, res, next) {
    // ── Prevent MIME-type sniffing ──────────────────────────────────────────
    res.set('X-Content-Type-Options', 'nosniff')

    // ── Prevent the API from ever being framed (clickjacking defence) ─────
    res.set('X-Frame-Options', 'DENY')

    // ── Content Security Policy ─────────────────────────────────────────────
    // This is a JSON API — it serves no HTML, scripts, or styles itself,
    // so the policy is maximally restrictive.
    res.set(
      'Content-Security-Policy',
      [
        "default-src 'none'",
        "frame-ancestors " + frameAncestors,
        "base-uri 'none'",
        "form-action 'none'",
      ].join('; ')
    )

    // ── Referrer policy ──────────────────────────────────────────────────────
    // Avoid leaking full URLs (which may contain query params with
    // sensitive context like password-reset tokens) to third parties.
    res.set('Referrer-Policy', 'no-referrer')

    // ── Restrict browser feature access ─────────────────────────────────────
    res.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    )

    // ── Cross-origin isolation ───────────────────────────────────────────────
    res.set('Cross-Origin-Opener-Policy',   'same-origin')
    res.set('Cross-Origin-Resource-Policy', 'same-origin')

    // ── Disable legacy XSS auditor header (superseded by CSP, but harmless) ──
    res.set('X-XSS-Protection', '0')

    // ── Remove the default Express fingerprint ──────────────────────────────
    res.removeHeader('X-Powered-By')

    // ── HSTS — only when actually served over HTTPS ──────────────────────────
    // Sending this over plain HTTP (e.g. local dev) would be misleading,
    // so it's gated behind the enableHSTS flag (defaults to production-only).
    if (enableHSTS) {
      res.set(
        'Strict-Transport-Security',
        `max-age=${hstsMaxAge}; includeSubDomains; preload`
      )
    }

    next()
  }
}

// ── Request body size guard ───────────────────────────────────────────────────

/**
 * Rejects requests with a Content-Length above the given limit before
 * the body is even parsed — a lightweight defence against oversized
 * payload abuse, independent of express.json()'s own limit option.
 *
 * @param {number} maxBytes — default 1MB
 * @returns {import('express').RequestHandler}
 */
export function requestSizeGuard(maxBytes = 1_000_000) {
  return function guardRequestSize(req, res, next) {
    const contentLength = parseInt(req.headers['content-length'] ?? '0', 10)
    if (contentLength > maxBytes) {
      return res.status(413).json({ error: 'Request payload is too large.' })
    }
    next()
  }
}

// ── Strict CORS-adjacent helper ───────────────────────────────────────────────

/**
 * Rejects any request whose Origin header is present but not on the
 * provided allowlist. Intended as a defence-in-depth layer alongside
 * (not instead of) the `cors` package's own origin checking.
 *
 * @param {string[]} allowedOrigins
 * @returns {import('express').RequestHandler}
 */
export function originAllowlist(allowedOrigins = []) {
  return function checkOrigin(req, res, next) {
    const origin = req.headers.origin
    if (!origin) return next() // non-browser clients (curl, mobile apps) send no Origin
    if (allowedOrigins.includes(origin)) return next()
    return res.status(403).json({ error: 'Origin not allowed.' })
  }
}