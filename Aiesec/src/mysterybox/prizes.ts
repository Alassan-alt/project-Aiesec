import type { PrizeDefinition, PrizeId } from './types'

export const LOCKER_COUNT = 1000

export const PRIZES: ReadonlyArray<PrizeDefinition> = [
  {
    id: 'KEYCHAIN',
    label: 'Porte-clés personnalisé',
    short: 'Porte-clés',
    baseCount: 10,
  },
  {
    id: 'PEN',
    label: 'Stylo personnalisé',
    short: 'Stylo',
    baseCount: 10,
  },
  {
    id: 'INTERNSHIP_10',
    label: 'Opportunité de stage (-10%)',
    short: 'Stage -10%',
    baseCount: 100,
  },
  {
    id: 'INTERNSHIP_5',
    label: 'Réduction stage (-5%)',
    short: 'Stage -5%',
    baseCount: 250,
  },
  {
    id: 'BOTTLE',
    label: 'Gourde personnalisée',
    short: 'Gourde',
    baseCount: 1,
  },
  {
    id: 'GOOD_LUCK',
    label: 'Bonne chance',
    short: 'Bonne chance',
    baseCount: 400,
  },
  {
    id: 'KISS',
    label: 'Bisou',
    short: 'Bisou',
    baseCount: 30,
  },
]

export function getPrizeDefinition(prizeId: PrizeId): PrizeDefinition {
  const prize = PRIZES.find((p) => p.id === prizeId)
  if (!prize) {
    // Should never happen unless storage is corrupted
    return {
      id: 'GOOD_LUCK',
      label: 'Bonne chance',
      short: 'Bonne chance',
      baseCount: 0,
    }
  }
  return prize
}

export function getEffectiveCounts(): {
  counts: Record<PrizeId, number>
  adjustedGoodLuckBy: number
  total: number
} {
  const counts = Object.fromEntries(PRIZES.map((p) => [p.id, p.baseCount])) as Record<
    PrizeId,
    number
  >

  const totalBase = PRIZES.reduce((sum, p) => sum + p.baseCount, 0)
  const delta = LOCKER_COUNT - totalBase

  // If the provided numbers don't sum to 1000, we auto-adjust GOOD_LUCK as the filler.
  // This keeps the same gift categories while reaching exactly 1000 lockers.
  if (delta !== 0) {
    counts.GOOD_LUCK = Math.max(0, counts.GOOD_LUCK + delta)
  }

  const total = (Object.values(counts) as number[]).reduce((s, n) => s + n, 0)
  return { counts, adjustedGoodLuckBy: delta, total }
}

export function buildPrizePool(): PrizeId[] {
  const { counts } = getEffectiveCounts()
  const pool: PrizeId[] = []

  ;(Object.entries(counts) as Array<[PrizeId, number]>).forEach(([id, count]) => {
    for (let i = 0; i < count; i++) pool.push(id)
  })

  return pool
}
