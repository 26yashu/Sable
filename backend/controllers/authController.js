import User from '../models/User.js'
import { signToken } from '../middleware/authMiddleware.js'

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
// Creates a new real account.
// Optional body fields: anonymousSessionId, displayName, companionName
export async function signup(req, res, next) {
  try {
    const { email, password, anonymousSessionId, displayName, companionName } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }

    const hashedPassword = await User.hashPassword(password)

    const user = await User.create({
      email,
      hashedPassword,
      displayName:         displayName ?? '',
      companionName:       companionName ?? 'Sable',
      anonymousSessionIds: anonymousSessionId ? [anonymousSessionId] : [],
    })

    const token = signToken(user)

    return res.status(201).json({ token, user: user.toSafeObject() })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Explicitly select hashedPassword (it's excluded by default via select: false)
    const user = await User.findOne({ email }).select('+hashedPassword')
    if (!user) {
      // Deliberate vague message — don't reveal whether email exists
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const valid = await user.verifyPassword(password)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const token = signToken(user)

    return res.json({ token, user: user.toSafeObject() })
  } catch (err) {
    next(err)
  }
}

// ── POST /api/auth/upgrade ────────────────────────────────────────────────────
// Attaches an additional anonymous session ID to an existing account.
// Requires a valid JWT (user must already be logged in).
export async function upgradeAnonymous(req, res, next) {
  try {
    const { anonymousSessionId } = req.body

    if (!anonymousSessionId) {
      return res.status(400).json({ error: 'anonymousSessionId is required' })
    }

    const user = req.user // populated by requireAuth middleware

    if (!user.anonymousSessionIds.includes(anonymousSessionId)) {
      user.anonymousSessionIds.push(anonymousSessionId)
      await user.save()
    }

    return res.json({ user: user.toSafeObject() })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
// Returns the currently authenticated user.
export async function getMe(req, res) {
  res.json({ user: req.user.toSafeObject() })
}