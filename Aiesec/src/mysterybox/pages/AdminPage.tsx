import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  adminGetLockers,
  adminGetPrizes,
  adminGetStats,
  adminLogin,
  adminRegenerate,
  adminReset,
  adminUpdatePrize,
  clearAdminToken,
  getAdminToken,
  setAdminToken,
} from '../api'
import type { PrizeId } from '../types'
import { QrCode } from '../components/QrCode'

function getBaseUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const url = new URL(base, window.location.origin)
  return url.toString()
}

function buildBoxUrl(token: string): string {
  return new URL(`box/${token}`, getBaseUrl()).toString()
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function AdminPage() {
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [adminToken, setAdminTokenState] = useState<string | null>(() => getAdminToken())
  const [authError, setAuthError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'links' | 'winners'>('links')

  const [generateCount, setGenerateCount] = useState<number>(1)

  const [loginUsername, setLoginUsername] = useState('admin')
  const [loginPassword, setLoginPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [lockers, setLockers] = useState<Awaited<ReturnType<typeof adminGetLockers>>>([])
  const [prizes, setPrizes] = useState<Awaited<ReturnType<typeof adminGetPrizes>>>([])
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminGetStats>> | null>(null)

  const [imageDraft, setImageDraft] = useState<Partial<Record<PrizeId, string>>>({})
  const [savingPrize, setSavingPrize] = useState<PrizeId | null>(null)

  async function refreshAll(token: string) {
    setLoading(true)
    setAuthError(null)
    try {
      const [prizesRes, statsRes, lockersRes] = await Promise.all([
        adminGetPrizes(token),
        adminGetStats(token),
        adminGetLockers(token),
      ])
      setPrizes(prizesRes)
      setStats(statsRes)
      setLockers(lockersRes)

      setImageDraft((prev) => {
        const next = { ...prev }
        for (const p of prizesRes) {
          if (next[p.id] === undefined) next[p.id] = p.imageUrl ?? ''
        }
        return next
      })
    } catch (e) {
      clearAdminToken()
      setAdminTokenState(null)
      setAuthError('Session expirée. Reconnectez-vous.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!adminToken) return
    void refreshAll(adminToken)
  }, [adminToken])

  async function onLoginSubmit(e: FormEvent) {
    e.preventDefault()
    setAuthError(null)
    setLoading(true)
    try {
      const token = await adminLogin(loginUsername, loginPassword)
      setAdminToken(token)
      setAdminTokenState(token)
      setLoginPassword('')
    } catch {
      setAuthError('Identifiants incorrects.')
    } finally {
      setLoading(false)
    }
  }

  async function regenerate() {
    if (!adminToken) return
    const count = Number.isFinite(generateCount) ? Math.floor(generateCount) : 1
    if (count < 1) return
    setLoading(true)
    try {
      const res = await adminRegenerate(adminToken, count)
      setSelectedToken(res.firstToken)
      await refreshAll(adminToken)
    } finally {
      setLoading(false)
    }
  }

  async function hardReset() {
    if (!adminToken) return
    if (!confirm('Réinitialiser (effacer liens + ouvertures) ?')) return
    setLoading(true)
    try {
      await adminReset(adminToken)
      setSelectedToken(null)
      await refreshAll(adminToken)
    } finally {
      setLoading(false)
    }
  }

  const opened = useMemo(() => {
    return lockers
      .filter((l) => Boolean(l.openedAt))
      .sort((a, b) => (b.openedAt ?? '').localeCompare(a.openedAt ?? ''))
  }, [lockers])

  const lockerRows = useMemo(() => {
    return [...lockers].sort((a, b) => a.token.localeCompare(b.token))
  }, [lockers])

  const prizeRows = useMemo(() => {
    return [...prizes]
      .map((p) => {
        const total = stats?.totalByPrize?.[p.id] ?? 0
        const used = stats?.usedByPrize?.[p.id] ?? 0
        const remaining = Math.max(0, total - used)
        return { ...p, total, used, remaining }
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
  }, [prizes, stats])

  if (!adminToken) {
    return (
      <div className="min-h-dvh bg-slate-100 text-slate-900">
        <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-5 py-10">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-medium tracking-widest text-slate-500">MYSTERY BOX</div>
            <h1 className="mt-2 text-2xl font-semibold">Connexion admin</h1>
            <p className="mt-2 text-sm text-slate-600">
              Connectez-vous pour accéder au tableau de bord.
            </p>

            <form className="mt-5 flex flex-col gap-3" onSubmit={onLoginSubmit}>
              <input
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="Nom d'utilisateur"
                autoComplete="username"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
              />
              <input
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="Mot de passe"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
              />

              {authError && <div className="text-xs text-amber-700">{authError}</div>}

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'rounded-xl bg-blue-600 px-4 py-3 text-sm font-medium text-white',
                  loading ? 'opacity-70' : 'hover:bg-blue-700',
                )}
              >
                Se connecter
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-5xl px-5 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Tableau de Bord Admin</h1>
          </div>

          <button
            type="button"
            onClick={() => {
              clearAdminToken()
              setAdminTokenState(null)
              setSelectedToken(null)
              setAuthError(null)
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Déconnexion
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Liens Générés</div>
            <div className="mt-2 text-2xl font-semibold">{stats?.total ?? '—'}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Casiers Ouverts</div>
            <div className="mt-2 text-2xl font-semibold">{stats?.used ?? '—'}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Restants</div>
            <div className="mt-2 text-2xl font-semibold">{stats?.unused ?? '—'}</div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200" />

        <div className="mt-8">
          <h2 className="text-lg font-semibold">Générer des liens cadeaux</h2>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-2 md:grid-cols-[220px_1fr] md:items-center">
              <div className="text-sm font-medium text-slate-700">Nombre de liens</div>
              <input
                value={String(generateCount)}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  if (!Number.isFinite(n)) return
                  setGenerateCount(n)
                }}
                type="number"
                min={1}
                step={1}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={regenerate}
              disabled={loading}
              className={cn(
                'w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white',
                loading ? 'opacity-70' : 'hover:bg-blue-700',
              )}
            >
              Générer des liens &amp; QR codes
            </button>

            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
              <div>
                Cliquez ensuite sur un lien pour afficher son QR code.
              </div>
              <button
                type="button"
                onClick={hardReset}
                disabled={loading}
                className={cn(
                  'text-sm font-medium text-slate-600 underline underline-offset-4',
                  loading ? 'opacity-60' : 'hover:text-slate-900',
                )}
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200" />

        <div className="mt-8">
          <h2 className="text-lg font-semibold">Suivi des Cadeaux</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">Cadeau</th>
                  <th className="px-4 py-3">Restant</th>
                </tr>
              </thead>
              <tbody>
                {prizeRows.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-800">{p.label}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {p.remaining} / {p.total}
                    </td>
                  </tr>
                ))}
                {prizeRows.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-600" colSpan={2}>
                      Aucun lot.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200" />

        <div className="mt-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('links')}
              className={cn(
                'text-sm font-semibold',
                activeTab === 'links'
                  ? 'text-blue-700 underline decoration-2 underline-offset-8'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              Liens Générés
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('winners')}
              className={cn(
                'text-sm font-semibold',
                activeTab === 'winners'
                  ? 'text-blue-700 underline decoration-2 underline-offset-8'
                  : 'text-slate-500 hover:text-slate-900',
              )}
            >
              Gagnants
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {activeTab === 'links' ? (
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Lien</th>
                      <th className="px-4 py-3">QR Code</th>
                      <th className="px-4 py-3">État</th>
                      <th className="px-4 py-3">Ouvert le</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lockerRows.map((l) => {
                      const used = Boolean(l.openedAt)
                      const link = buildBoxUrl(l.token)
                      const isSelected = selectedToken === l.token
                      return (
                        <tr
                          key={l.token}
                          className={cn(
                            'border-t border-slate-100',
                            isSelected && 'bg-blue-50',
                          )}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">{l.token}</td>
                          <td className="px-4 py-3">
                            <a
                              className="text-sm text-blue-700 underline underline-offset-4"
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {link}
                            </a>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => setSelectedToken(l.token)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Voir
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            {used ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                Utilisé
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                Non Utilisé
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {formatDateTime(l.openedAt)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Ouvert le</th>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Nom</th>
                      <th className="px-4 py-3">Cadeau</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opened.map((l) => (
                      <tr key={l.token} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatDateTime(l.openedAt)}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{l.token}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{l.userName ?? '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{l.prize.short}</td>
                      </tr>
                    ))}
                    {opened.length === 0 && (
                      <tr>
                        <td className="px-4 py-4 text-sm text-slate-600" colSpan={4}>
                          Aucun gagnant pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="text-sm text-slate-600">
              {authError ? authError : 'Données partagées entre appareils (backend).'}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold">QR Code</div>

              {selectedToken ? (
                <div className="mt-3 grid gap-3">
                  <div className="grid place-items-center rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <QrCode text={buildBoxUrl(selectedToken)} size={180} />
                  </div>
                  <div className="text-xs text-slate-600">
                    <div className="font-medium text-slate-700">Lien</div>
                    <div className="mt-1 break-all font-mono">{buildBoxUrl(selectedToken)}</div>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(buildBoxUrl(selectedToken))}
                      className="mt-3 w-full rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Copier le lien
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-slate-600">
                  Sélectionnez un lien pour afficher son QR code.
                </div>
              )}
            </div>
          </div>

          <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800">
              Images des lots (URL)
            </summary>
            <div className="mt-4 grid gap-3">
              {prizes.map((p) => (
                <div key={p.id} className="grid gap-2 md:grid-cols-[240px_1fr_auto] md:items-center">
                  <div className="text-sm font-medium text-slate-800">{p.label}</div>
                  <input
                    value={imageDraft[p.id] ?? ''}
                    onChange={(e) =>
                      setImageDraft((d) => ({
                        ...d,
                        [p.id]: e.target.value,
                      }))
                    }
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <button
                    type="button"
                    disabled={savingPrize === p.id || !adminToken}
                    onClick={async () => {
                      if (!adminToken) return
                      setSavingPrize(p.id)
                      try {
                        const raw = (imageDraft[p.id] ?? '').trim()
                        await adminUpdatePrize(adminToken, p.id, {
                          imageUrl: raw.length === 0 ? null : raw,
                        })
                        const next = await adminGetPrizes(adminToken)
                        setPrizes(next)
                      } finally {
                        setSavingPrize(null)
                      }
                    }}
                    className={cn(
                      'rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white',
                      savingPrize === p.id ? 'opacity-70' : 'hover:bg-blue-700',
                    )}
                  >
                    Sauver
                  </button>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
