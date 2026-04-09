import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDb } from './db.js'
import publicRoutes from './routes/public.js'
import adminRoutes, { ensureSeeded } from './routes/admin.js'

const app = express()

const port = Number(process.env.PORT || 4000)
const isProd = process.env.NODE_ENV === 'production'
const defaultClientOrigin = 'http://localhost:5173'
const clientOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true)

      // In production, require an explicit allow-list.
      if (isProd) {
        return cb(null, clientOrigins.includes(origin))
      }

      // In dev, allow any localhost port (Vite may bump ports).
      if (origin.startsWith('http://localhost:')) return cb(null, true)

      if (clientOrigins.length === 0) {
        return cb(null, origin === defaultClientOrigin)
      }

      return cb(null, clientOrigins.includes(origin))
    },
    credentials: false,
  }),
)

app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/api', publicRoutes)
app.use('/api', adminRoutes)

async function main() {
  await connectDb()
  await ensureSeeded()

  app.listen(port, () => {
    console.log(`[server] listening on http://localhost:${port}`)
    console.log(
      `[server] client origin(s): ${clientOrigins.length > 0 ? clientOrigins.join(', ') : '(dev) http://localhost:<any>'}`,
    )
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
