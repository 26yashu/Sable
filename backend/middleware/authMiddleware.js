import jwt from 'jsonwebtoken'
import User from '../models/User.js'

/**
 * requireAuth — protects routes that need a valid JWT.
 * Attaches req.user (full Mongoose doc) on success.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization ?? ''
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = header.slice(7)
    const payload = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(payload.sub)
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    req.user = user
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}

/**
 * signToken — generate a signed JWT for a user document.
 */
export function signToken(user) {
  return jwt.sign(
    { sub: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '30d' }
  )
}