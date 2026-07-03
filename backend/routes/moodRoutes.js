import { Router } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { logMood, getMoodHistory, getMoodStats } from '../controllers/moodController.js'

const router = Router()

async function softAuth(req, _res, next) {
  const header = req.headers.authorization ?? ''
  if (!header.startsWith('Bearer ')) return next()
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    const user    = await User.findById(payload.sub)
    if (user) req.user = user
  } catch { /* anonymous */ }
  next()
}

router.use(softAuth)

// Order matters: /stats must come before /:id style routes
router.get('/stats', getMoodStats)
router.post('/',     logMood)
router.get('/',      getMoodHistory)

export default router