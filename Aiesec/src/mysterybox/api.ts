import type { PrizeId } from './types'

export type ApiPrize = {
  id: PrizeId
  label: string
  short: string
  baseCount: number
  imageUrl: string | null
}

export type PublicLocker = {
  token: string
  userName: string | null
  openedAt: string | null
  prize: (Pick<ApiPrize, 'id' | 'label' | 'short' | 'imageUrl'>) | null
}

export type AdminLocker = {
  token: string
  prizeId: PrizeId
  createdAt: string
  openedAt: string | null
  userName: string | null
  prize: ApiPrize
}

export type AdminStats = {
  total: number
  used: number
  unused: number
  usedByPrize: Partial<Record<PrizeId, number>>
  totalByPrize: Partial<Record<PrizeId, number>>
}

function getApiBase(): string {
  // If VITE_API_URL is unset, use same-origin (works with Vite proxy).
  return (import.meta as any).env?.VITE_API_URL ?? ''
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { adminToken?: string },
): Promise<T> {
  const url = `${getApiBase()}${path}`
  const headers = new Headers(init?.headers)
  headers.set('accept', 'application/json')

  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  if (init?.adminToken) {
    headers.set('authorization', `Bearer ${init.adminToken}`)
  }

  const res = await fetch(url, {
    ...init,
    headers,
  })

  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) {
    const err = (data && typeof data === 'object' && 'error' in data && (data as any).error) ||
      `http_${res.status}`
    throw new Error(String(err))
  }

  return data as T
}

export const adminAuthStorageKey = 'aiesec.admin.jwt'

export function getAdminToken(): string | null {
  return localStorage.getItem(adminAuthStorageKey)
}

export function setAdminToken(token: string) {
  localStorage.setItem(adminAuthStorageKey, token)
}

export function clearAdminToken() {
  localStorage.removeItem(adminAuthStorageKey)
}

export async function adminLogin(username: string, password: string): Promise<string> {
  const res = await apiFetch<{ token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  return res.token
}

export async function adminMe(adminToken: string): Promise<{ id: string; username: string }> {
  return apiFetch('/api/admin/me', { method: 'GET', adminToken })
}

export async function adminGetPrizes(adminToken: string): Promise<ApiPrize[]> {
  const res = await apiFetch<{ prizes: ApiPrize[] }>('/api/admin/prizes', {
    method: 'GET',
    adminToken,
  })
  return res.prizes
}

export async function adminUpdatePrize(
  adminToken: string,
  prizeId: PrizeId,
  patch: Partial<Pick<ApiPrize, 'label' | 'short' | 'baseCount' | 'imageUrl'>>,
): Promise<ApiPrize> {
  const res = await apiFetch<{ prize: ApiPrize }>(`/api/admin/prizes/${prizeId}`, {
    method: 'PATCH',
    adminToken,
    body: JSON.stringify(patch),
  })
  return res.prize
}

export async function adminGetLockers(adminToken: string): Promise<AdminLocker[]> {
  const res = await apiFetch<{ lockers: AdminLocker[] }>('/api/admin/lockers', {
    method: 'GET',
    adminToken,
  })
  return res.lockers
}

export async function adminGetStats(adminToken: string): Promise<AdminStats> {
  return apiFetch('/api/admin/stats', { method: 'GET', adminToken })
}

export async function adminRegenerate(
  adminToken: string,
  count = 1,
): Promise<{ created: number; firstToken: string | null }> {
  return apiFetch('/api/admin/regenerate', {
    method: 'POST',
    adminToken,
    body: JSON.stringify({ count }),
  })
}

export async function adminReset(adminToken: string): Promise<{ ok: boolean }> {
  return apiFetch('/api/admin/reset', {
    method: 'POST',
    adminToken,
    body: JSON.stringify({ confirm: true }),
  })
}

export async function getPublicLocker(token: string): Promise<PublicLocker> {
  return apiFetch(`/api/lockers/${encodeURIComponent(token)}`, { method: 'GET' })
}

export async function claimLockerName(token: string, userName: string): Promise<{ token: string; userName: string | null }> {
  return apiFetch(`/api/lockers/${encodeURIComponent(token)}/claim`, {
    method: 'POST',
    body: JSON.stringify({ userName }),
  })
}

export async function openLocker(token: string, selectedIdx?: number): Promise<PublicLocker> {
  return apiFetch(`/api/lockers/${encodeURIComponent(token)}/open`, {
    method: 'POST',
    body: JSON.stringify({ selectedIdx }),
  })
}
