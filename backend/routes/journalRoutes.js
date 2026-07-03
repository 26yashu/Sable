import { Router } from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import {
  createEntry,
  listEntries,
  getEntry,
  updateEntry,
  deleteEntry,
} from '../controllers/journalController.js'

const router = Router()

// Identical to chat's softAuth — attach req.user if JWT valid, else anonymous
async function softAuth(req, _res, next) {
  const header = req.headers.authorization ?? ''
  if (!header.startsWith('Bearer ')) return next()
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET)
    const user    = await User.findById(payload.sub)
    if (user) req.user = user
  } catch { /* treat as anonymous */ }
  next()
}

router.use(softAuth)

router.post('/',    createEntry)
router.get('/',     listEntries)
router.get('/:id',  getEntry)
router.put('/:id',  updateEntry)
router.delete('/:id', deleteEntry)

export default router