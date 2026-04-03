import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildPrizePool, getEffectiveCounts, getPrizeDefinition, PRIZES } from '../prizes'
import { generateToken } from '../token'
import { getAllLockers, getStats, resetState, upsertLockers } from '../storage'
import type { LockerRecord } from '../types'
import { QrCode } from '../components/QrCode'

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const r = crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32
    const j = Math.floor(r * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function getBaseUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const url = new URL(base, window.location.origin)
  return url.toString()
}

function buildBoxUrl(token: string): string {
  return new URL(`box/${token}`, getBaseUrl()).toString()
}

export function AdminPage() {
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const handler = () => setRefresh((r) => r + 1)
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  // Read from localStorage on each render; `refresh` simply forces rerenders.
  // This stays in sync when a box is opened in another tab (storage event).
  void refresh
  const lockers = getAllLockers()
  const stats = getStats()

  const effective = useMemo(() => getEffectiveCounts(), [])

  function regenerate() {
    if (!confirm('Créer 1000 liens et écraser les données locales existantes ?')) return

    resetState()

    const pool = buildPrizePool()
    shuffleInPlace(pool)

    const createdAtIso = new Date().toISOString()
    const newLockers: LockerRecord[] = []
    const used = new Set<string>()

    for (let i = 0; i < pool.length; i++) {
      let token = generateToken(16)
      while (used.has(token)) token = generateToken(16)
      used.add(token)

      newLockers.push({
        token,
        prizeId: pool[i],
        createdAtIso,
      })
    }

    upsertLockers(newLockers)
    setSelectedToken(newLockers[0]?.token ?? null)
    setRefresh((r) => r + 1)
  }

  function hardReset() {
    if (!confirm('Réinitialiser (effacer liens + ouvertures) ?')) return
    resetState()
    setSelectedToken(null)
    setRefresh((r) => r + 1)
  }

  const opened = useMemo(() => {
    return lockers
      .filter((l) => Boolean(l.openedAtIso))
      .sort((a, b) => (b.openedAtIso ?? '').localeCompare(a.openedAtIso ?? ''))
  }, [lockers])

  const lockerRows = useMemo(() => {
    return [...lockers].sort((a, b) => a.token.localeCompare(b.token))
  }, [lockers])

  return (
    <div className="min-h-dvh bg-blue-950 text-white">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-medium tracking-widest text-white/70">
              MYSTERY BOX
            </div>
            <h1 className="mt-2 text-3xl font-semibold">Dashboard admin</h1>
            <p className="mt-2 text-sm text-white/80">
              Génère les liens/QR, vois le statut et les stocks.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={regenerate}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-blue-900"
            >
              Créer 1000 liens
            </button>
            <button
              type="button"
              onClick={hardReset}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {effective.adjustedGoodLuckBy !== 0 && (
          <div className="mt-6 rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-white">
            Les quantités fournies ne totalisent pas 1000. Le lot « Bonne chance » est ajusté de{' '}
            <span className="font-semibold">{effective.adjustedGoodLuckBy}</span> pour atteindre{' '}
            <span className="font-semibold">{effective.total}</span> casiers.
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl">
            <div className="text-xs font-medium tracking-widest text-white/70">LIENS</div>
            <div className="mt-2 text-2xl font-semibold">{stats.total}</div>
            <div className="mt-2 text-sm text-white/80">Total générés</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl">
            <div className="text-xs font-medium tracking-widest text-white/70">UTILISÉS</div>
            <div className="mt-2 text-2xl font-semibold">{stats.used}</div>
            <div className="mt-2 text-sm text-white/80">Casiers ouverts</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl">
            <div className="text-xs font-medium tracking-widest text-white/70">DISPONIBLES</div>
            <div className="mt-2 text-2xl font-semibold">{stats.unused}</div>
            <div className="mt-2 text-sm text-white/80">Non utilisés</div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium tracking-widest text-white/70">STOCKS</div>
                <h2 className="mt-2 text-lg font-semibold">Lots restants</h2>
              </div>
              <Link to="/" className="text-sm text-white/70 hover:text-white">
                Retour
              </Link>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {PRIZES.map((p) => {
                const total = effective.counts[p.id]
                const used = stats.usedByPrize[p.id] ?? 0
                const remaining = Math.max(0, total - used)

                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-white/15 bg-blue-950/35 p-4"
                  >
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="mt-2 text-xs text-white/80">
                      Total: <span className="font-mono text-white">{total}</span> • Utilisés:{' '}
                      <span className="font-mono text-white">{used}</span> • Restants:{' '}
                      <span className="font-mono text-white">{remaining}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl">
            <div className="text-xs font-medium tracking-widest text-white/70">QR CODE</div>
            <h2 className="mt-2 text-lg font-semibold">Aperçu</h2>

            {selectedToken ? (
              <div className="mt-4">
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/15 bg-blue-950/35 p-4">
                  <QrCode text={buildBoxUrl(selectedToken)} size={200} />
                  <div className="text-center">
                    <div className="text-xs text-white/70">Lien</div>
                    <div className="mt-1 break-all font-mono text-xs text-white">
                      {buildBoxUrl(selectedToken)}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(buildBoxUrl(selectedToken))}
                      className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-medium text-blue-900"
                    >
                      Copier le lien
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/15 bg-blue-950/35 p-4 text-sm text-white/80">
                Sélectionne un lien pour afficher son QR code.
              </div>
            )}

            <div className="mt-5 text-xs text-white/70">
              Astuce: génère les liens puis clique une ligne.
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl">
            <div className="text-xs font-medium tracking-widest text-white/70">LIENS</div>
            <h2 className="mt-2 text-lg font-semibold">Statut (utilisé / non utilisé)</h2>

            <div className="mt-4 overflow-hidden rounded-xl border border-white/15">
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-blue-950/85 backdrop-blur">
                    <tr className="text-xs text-white/70">
                      <th className="px-3 py-2">Statut</th>
                      <th className="px-3 py-2">Token</th>
                      <th className="px-3 py-2">Lot</th>
                      <th className="px-3 py-2">QR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lockerRows.map((l) => {
                      const used = Boolean(l.openedAtIso)
                      const prize = getPrizeDefinition(l.prizeId)
                      return (
                        <tr
                          key={l.token}
                          className="border-t border-white/10 hover:bg-white/10"
                        >
                          <td className="px-3 py-2">
                            {used ? (
                              <span className="rounded-full bg-blue-400/20 px-2 py-1 text-xs font-medium text-white">
                                Utilisé
                              </span>
                            ) : (
                              <span className="rounded-full bg-white/15 px-2 py-1 text-xs font-medium text-white/90">
                                Libre
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{l.token}</td>
                          <td className="px-3 py-2 text-xs text-white/80">{prize.short}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setSelectedToken(l.token)}
                              className="rounded-lg bg-white px-2 py-1 text-xs font-medium text-blue-900"
                            >
                              Voir
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl">
            <div className="text-xs font-medium tracking-widest text-white/70">GAGNANTS</div>
            <h2 className="mt-2 text-lg font-semibold">Casiers ouverts</h2>

            <div className="mt-4 overflow-hidden rounded-xl border border-white/15">
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-blue-950/85 backdrop-blur">
                    <tr className="text-xs text-white/70">
                      <th className="px-3 py-2">Ouvert le</th>
                      <th className="px-3 py-2">Token</th>
                      <th className="px-3 py-2">Lot</th>
                      <th className="px-3 py-2">Lien</th>
                    </tr>
                  </thead>
                  <tbody>
                    {opened.map((l) => {
                      const prize = getPrizeDefinition(l.prizeId)
                      return (
                        <tr
                          key={l.token}
                          className="border-t border-white/10 hover:bg-white/10"
                        >
                          <td className="px-3 py-2 text-xs text-white/80">
                            {(l.openedAtIso ?? '').slice(0, 19).replace('T', ' ')}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{l.token}</td>
                          <td className="px-3 py-2 text-xs text-white/80">{prize.short}</td>
                          <td className="px-3 py-2">
                            <a
                              className="text-xs text-white/80 underline hover:text-white"
                              href={buildBoxUrl(l.token)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ouvrir
                            </a>
                          </td>
                        </tr>
                      )
                    })}
                    {opened.length === 0 && (
                      <tr>
                        <td className="px-3 py-4 text-sm text-white/80" colSpan={4}>
                          Aucun gagnant pour le moment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 text-xs text-white/70">
              Note: ce dashboard est 100% frontend (stocké dans le navigateur). Pour une sécurité “globale” (1 ouverture sur tous appareils), il faudra un backend.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
