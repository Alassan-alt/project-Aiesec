import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDb } from './db.js'
import publicRoutes from './routes/public.js'
import adminRoutes, { ensureSeeded } from './routes/admin.js'

const app = express()

const port = Number(process.env.PORT || 4000)
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use(
  cors({
    origin: clientOrigin,
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
    console.log(`[server] client origin: ${clientOrigin}`)
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
