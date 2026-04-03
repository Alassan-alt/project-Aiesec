import type { LockerRecord, MysteryBoxStateV1, PrizeId } from './types'

const STORAGE_KEY = 'aiesec.mysterybox.v1'

function safeParse(json: string | null): unknown {
  if (!json) return null
  try {
    return JSON.parse(json)
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStateV1(value: unknown): value is MysteryBoxStateV1 {
  if (!isRecord(value)) return false
  if (value.version !== 1) return false
  if (!('lockers' in value)) return false
  return isRecord(value.lockers)
}

export function loadState(): MysteryBoxStateV1 {
  const parsed = safeParse(localStorage.getItem(STORAGE_KEY))
  if (isStateV1(parsed)) return parsed
  return { version: 1, lockers: {} }
}

export function saveState(state: MysteryBoxStateV1) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY)
}

export function getLocker(token: string): LockerRecord | null {
  const state = loadState()
  return state.lockers[token] ?? null
}

export function upsertLockers(lockers: LockerRecord[]) {
  const state = loadState()
  for (const locker of lockers) {
    state.lockers[locker.token] = locker
  }
  saveState(state)
}

export function markOpened(token: string): LockerRecord | null {
  const state = loadState()
  const locker = state.lockers[token]
  if (!locker) return null
  if (locker.openedAtIso) return locker

  const updated: LockerRecord = {
    ...locker,
    openedAtIso: new Date().toISOString(),
  }
  state.lockers[token] = updated
  saveState(state)
  return updated
}

export function getAllLockers(): LockerRecord[] {
  const state = loadState()
  return Object.values(state.lockers)
}

export function getStats(): {
  total: number
  used: number
  unused: number
  usedByPrize: Record<PrizeId, number>
} {
  const lockers = getAllLockers()
  const used = lockers.filter((l) => Boolean(l.openedAtIso)).length
  const usedByPrize = lockers.reduce((acc, l) => {
    if (l.openedAtIso) acc[l.prizeId] = (acc[l.prizeId] ?? 0) + 1
    return acc
  }, {} as Record<PrizeId, number>)

  return {
    total: lockers.length,
    used,
    unused: lockers.length - used,
    usedByPrize,
  }
}
