import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { collections } from '../db.js'
import { getAdmin, requireAdmin, signAdminJwt } from '../auth.js'
import { DEFAULT_PRIZES } from '../prizeDefaults.js'
import { buildPrizePool, shuffleInPlace } from '../pool.js'
import { generateToken } from '../token.js'

const LOCKER_COUNT = 1000

const router = Router()

function pickWeightedPrizeId(prizes: Array<{ _id: string; baseCount: number }>): string {
  const weights = prizes.map((p) => Math.max(0, Number(p.baseCount) || 0))
  const total = weights.reduce((s, w) => s + w, 0)

  // If all weights are 0, fall back to uniform.
  if (total <= 0) {
    const idx = Math.floor(Math.random() * prizes.length)
    return prizes[Math.max(0, Math.min(prizes.length - 1, idx))]!._id
  }

  let r = Math.random() * total
  for (let i = 0; i < prizes.length; i++) {
    r -= weights[i]!
    if (r <= 0) return prizes[i]!._id
  }
  return prizes[prizes.length - 1]!._id
}

router.post('/auth/login', async (req, res) => {
  const bodySchema = z.object({ username: z.string().min(1), password: z.string().min(1) })
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' })

  const username = parsed.data.username.trim()
  const password = parsed.data.password

  const { adminUsers } = collections()
  const user = await adminUsers.findOne({ username })
  if (!user) return res.status(401).json({ error: 'invalid_credentials' })

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'invalid_credentials' })

  const token = signAdminJwt({ sub: String(user._id), username: user.username })
  return res.json({ token })
})

router.get('/admin/me', requireAdmin, async (req, res) => {
  const admin = getAdmin(req)
  return res.json({ id: admin?.sub, username: admin?.username })
})

router.get('/admin/prizes', requireAdmin, async (_req, res) => {
  const { prizes: prizesCol } = collections()
  const prizes = await prizesCol.find({}, { sort: { _id: 1 } }).toArray()
  return res.json({
    prizes: prizes.map((p) => ({
      id: p._id,
      label: p.label,
      short: p.short,
      baseCount: p.baseCount,
      imageUrl: p.imageUrl ?? null,
    })),
  })
})

router.patch('/admin/prizes/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id)

  const bodySchema = z
    .object({
      label: z.string().min(1).max(120).optional(),
      short: z.string().min(1).max(60).optional(),
      baseCount: z.number().int().min(0).max(1000).optional(),
      imageUrl: z.string().url().max(500).nullable().optional(),
    })
    .strict()

  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' })

  const { prizes: prizesCol } = collections()
  const now = new Date()

  const updated = await prizesCol.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        ...('label' in parsed.data ? { label: parsed.data.label } : {}),
        ...('short' in parsed.data ? { short: parsed.data.short } : {}),
        ...('baseCount' in parsed.data ? { baseCount: parsed.data.baseCount } : {}),
        ...('imageUrl' in parsed.data ? { imageUrl: parsed.data.imageUrl ?? null } : {}),
        updatedAt: now,
      },
    },
    { returnDocument: 'after' },
  )

  if (!updated) return res.status(404).json({ error: 'not_found' })

  return res.json({
    prize: {
      id: updated._id,
      label: updated.label,
      short: updated.short,
      baseCount: updated.baseCount,
      imageUrl: updated.imageUrl ?? null,
    },
  })
})

router.get('/admin/lockers', requireAdmin, async (_req, res) => {
  const { lockers: lockersCol, prizes: prizesCol } = collections()
  const [lockers, prizes] = await Promise.all([
    lockersCol.find({}, { sort: { _id: 1 } }).toArray(),
    prizesCol.find({}).toArray(),
  ])

  const prizeById = new Map(prizes.map((p) => [p._id, p]))

  return res.json({
    lockers: lockers
      .map((l) => {
        const prize = prizeById.get(l.prizeId)
        if (!prize) return null
        return {
          token: l._id,
          prizeId: l.prizeId,
          createdAt: l.createdAt,
          openedAt: l.openedAt ?? null,
          userName: l.userName ?? null,
          prize: {
            id: prize._id,
            label: prize.label,
            short: prize.short,
            baseCount: prize.baseCount,
            imageUrl: prize.imageUrl ?? null,
          },
        }
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x)),
  })
})

router.get('/admin/stats', requireAdmin, async (_req, res) => {
  const { lockers: lockersCol } = collections()

  const [total, used, groupedUsed, groupedTotal] = await Promise.all([
    lockersCol.countDocuments({}),
    lockersCol.countDocuments({ openedAt: { $exists: true, $ne: null } }),
    lockersCol
      .aggregate<{ _id: string; count: number }>([
        { $match: { openedAt: { $exists: true, $ne: null } } },
        { $group: { _id: '$prizeId', count: { $sum: 1 } } },
      ])
      .toArray(),
    lockersCol
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$prizeId', count: { $sum: 1 } } },
      ])
      .toArray(),
  ])

  const usedByPrize = Object.fromEntries(groupedUsed.map((g) => [g._id, g.count]))
  const totalByPrize = Object.fromEntries(groupedTotal.map((g) => [g._id, g.count]))

  return res.json({
    total,
    used,
    unused: total - used,
    usedByPrize,
    totalByPrize,
  })
})

router.post('/admin/regenerate', requireAdmin, async (req, res) => {
  const bodySchema = z
    .object({
      count: z.number().int().min(1).max(5000).optional(),
    })
    .strict()

  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' })

  const count = parsed.data.count ?? 1

  const { prizes: prizesCol, lockers: lockersCol } = collections()
  const prizes = await prizesCol.find({}).toArray()
  if (prizes.length === 0) return res.status(409).json({ error: 'no_prizes' })

  const createdTokens: string[] = []
  const now = new Date()

  // Insert one-by-one to handle token collisions (duplicate _id) gracefully.
  while (createdTokens.length < count) {
    const token = generateToken(16)
    const prizeId = pickWeightedPrizeId(prizes)
    try {
      await lockersCol.insertOne({ _id: token, prizeId, createdAt: now })
      createdTokens.push(token)
    } catch (e: any) {
      // Duplicate key => retry token.
      if (e && (e.code === 11000 || String(e?.codeName || '') === 'DuplicateKey')) continue
      throw e
    }
  }

  return res.json({
    created: createdTokens.length,
    firstToken: createdTokens[0] ?? null,
  })
})

router.post('/admin/reset', requireAdmin, async (req, res) => {
  const bodySchema = z
    .object({
      confirm: z.literal(true),
    })
    .strict()

  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_body' })

  const { lockers: lockersCol } = collections()
  await lockersCol.deleteMany({})
  return res.json({ ok: true })
})

export async function ensureSeeded() {
  const { prizes: prizesCol, adminUsers } = collections()

  // Seed prizes if missing
  const prizeCount = await prizesCol.countDocuments({})
  if (prizeCount === 0) {
    const now = new Date()
    await prizesCol.insertMany(
      DEFAULT_PRIZES.map((p) => ({
        _id: p.id,
        label: p.label,
        short: p.short,
        baseCount: p.baseCount,
        imageUrl: null,
        createdAt: now,
        updatedAt: now,
      })),
      { ordered: true },
    )
  }

  // Seed an admin user if missing
  const adminCount = await adminUsers.countDocuments({})
  if (adminCount === 0) {
    const username = (process.env.ADMIN_USERNAME || 'admin').trim()
    const password = process.env.ADMIN_PASSWORD || ''
    if (password.trim().length < 8) {
      // Don't auto-create if password is weak; force operator to set env.
      return
    }
    const now = new Date()
    const passwordHash = await bcrypt.hash(password, 10)
    await adminUsers.insertOne({
      username,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    })
  }
}

export default router
