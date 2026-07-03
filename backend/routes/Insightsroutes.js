import { Router } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { getWeeklyInsights } from '../controllers/insightsController.js'

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
router.get('/weekly', getWeeklyInsights)

export default router