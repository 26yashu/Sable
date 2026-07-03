import 'dotenv/config'
import express    from 'express'
import cors       from 'cors'
import mongoose   from 'mongoose'
import authRoutes    from './routes/authRoutes.js'
import chatRoutes    from './routes/chatRoutes.js'
import journalRoutes from './routes/journalRoutes.js'
import moodRoutes    from './routes/moodRoutes.js'
import trendsRoutes   from './routes/trendsRoutes.js'
import insightsRoutes     from './routes/insightsRoutes.js'
import monthlyStoryRoutes from './routes/monthlyStoryRoutes.js'

const app  = express()
const PORT = process.env.PORT || 4000

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }))
app.use(express.json())

app.use('/api/auth',    authRoutes)
app.use('/api/chat',    chatRoutes)
app.use('/api/journal', journalRoutes)
app.use('/api/mood',    moodRoutes)
app.use('/api/trends',   trendsRoutes)
app.use('/api/insights', insightsRoutes)
app.use('/api/insights', monthlyStoryRoutes)

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'sable-api' }))

app.use((err, _req, res, _next) => {
  console.error('[sable-api error]', err)
  res.status(err.status ?? 500).json({ error: err.message ?? 'Internal server error' })
})

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('[sable-api] MongoDB connected')
    app.listen(PORT, () => console.log(`[sable-api] Listening on :${PORT}`))
  })
  .catch((err) => {
    console.error('[sable-api] MongoDB connection failed:', err.message)
    process.exit(1)
  })