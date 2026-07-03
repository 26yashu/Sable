import JournalEntry from '../models/JournalEntry.js'

// ── Resolve owner from request (mirrors chatController) ───────────────────────
function resolveOwner(req) {
  if (req.user) {
    return { ownerId: String(req.user._id), ownerType: 'user' }
  }
  const anonId = req.headers['x-anon-id']
  if (anonId && /^[0-9a-f-]{36}$/i.test(anonId)) {
    return { ownerId: anonId, ownerType: 'anonymous' }
  }
  return null
}

// ── POST /api/journal ─────────────────────────────────────────────────────────
export async function createEntry(req, res, next) {
  try {
    const owner = resolveOwner(req)
    if (!owner) return res.status(401).json({ error: 'No session identified.' })

    const { title = '', content, moodTag = null } = req.body

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Entry content is required.' })
    }

    const entry = await JournalEntry.create({
      ...owner,
      title:   title.trim(),
      content: content.trim(),
      moodTag: moodTag ?? null,
    })

    return res.status(201).json({ entry: entry.toSafeObject() })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/journal ──────────────────────────────────────────────────────────
// Supports ?mood=calm, ?search=text, ?limit=20, ?before=<ISO date>
export async function listEntries(req, res, next) {
  try {
    const owner = resolveOwner(req)
    if (!owner) return res.status(401).json({ error: 'No session identified.' })

    const { mood, search, limit: rawLimit = 30, before } = req.query
    const limit = Math.min(parseInt(rawLimit) || 30, 100)

    const query = { ownerId: owner.ownerId }

    if (mood)   query.moodTag = mood
    if (before) query.createdAt = { $lt: new Date(before) }

    if (search?.trim()) {
      const pattern = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      query.$or = [{ title: pattern }, { content: pattern }]
    }

    const entries = await JournalEntry
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const safe = entries.map((e) => ({
      id:        e._id,
      title:     e.title,
      content:   e.content,
      moodTag:   e.moodTag,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }))

    return res.json({ entries: safe })
  } catch (err) {
    next(err)
  }
}

// ── GET /api/journal/:id ──────────────────────────────────────────────────────
export async function getEntry(req, res, next) {
  try {
    const owner = resolveOwner(req)
    if (!owner) return res.status(401).json({ error: 'No session identified.' })

    const entry = await JournalEntry.findOne({ _id: req.params.id, ownerId: owner.ownerId })
    if (!entry) return res.status(404).json({ error: 'Entry not found.' })

    return res.json({ entry: entry.toSafeObject() })
  } catch (err) {
    next(err)
  }
}

// ── PUT /api/journal/:id ──────────────────────────────────────────────────────
export async function updateEntry(req, res, next) {
  try {
    const owner = resolveOwner(req)
    if (!owner) return res.status(401).json({ error: 'No session identified.' })

    const { title, content, moodTag } = req.body
    if (content !== undefined && !content?.trim()) {
      return res.status(400).json({ error: 'Content cannot be empty.' })
    }

    const update = {}
    if (title   !== undefined) update.title   = title.trim()
    if (content !== undefined) update.content = content.trim()
    if (moodTag !== undefined) update.moodTag = moodTag ?? null

    const entry = await JournalEntry.findOneAndUpdate(
      { _id: req.params.id, ownerId: owner.ownerId },
      { $set: update },
      { new: true, runValidators: true }
    )

    if (!entry) return res.status(404).json({ error: 'Entry not found.' })

    return res.json({ entry: entry.toSafeObject() })
  } catch (err) {
    next(err)
  }
}

// ── DELETE /api/journal/:id ───────────────────────────────────────────────────
// Soft-delete: sets deletedAt rather than destroying the document
export async function deleteEntry(req, res, next) {
  try {
    const owner = resolveOwner(req)
    if (!owner) return res.status(401).json({ error: 'No session identified.' })

    const entry = await JournalEntry.findOneAndUpdate(
      { _id: req.params.id, ownerId: owner.ownerId },
      { $set: { deletedAt: new Date() } },
      { new: true }
    )

    if (!entry) return res.status(404).json({ error: 'Entry not found.' })

    return res.json({ success: true })
  } catch (err) {
    next(err)
  }
}