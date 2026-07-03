import { Router } from 'express'
import { signup, login, upgradeAnonymous, getMe } from '../controllers/authController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = Router()

router.post('/signup',  signup)
router.post('/login',   login)
router.post('/upgrade', requireAuth, upgradeAnonymous)
router.get('/me',       requireAuth, getMe)

export default router