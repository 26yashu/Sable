import { Router }  from 'express'
import jwt         from 'jsonwebtoken'
import User        from '../models/User.js'
import { sendMessage, getHistory } from '../controllers/chatController.js'

const router = Router()

/**
 * softAuth — attaches req.user when a valid Bearer token is present.
 * Continues as anonymous when the header is absent or the token is invalid.
 * Never blocks the request.
 */
async function softAuth(req, _res, next) {
  const header = req.headers.authorization ?? ''
  if (!header.startsWith('Bearer ')) return next()

  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    const user    = await User.findById(payload.sub)
    if (user) req.user = user
  } catch {
    // Expired or invalid token — fall through as anonymous
  }

  next()
}

router.post('/',       softAuth, sendMessage)
router.get('/history', softAuth, getHistory)

export default router