import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPrizeDefinition } from '../prizes'
import { getLocker, markOpened } from '../storage'
import { isLikelyToken } from '../token'

type Stage = 'idle' | 'opening' | 'opened'

const GRID_SIZE = 9

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function BoxPage() {
  const params = useParams()
  const token = useMemo(() => params.token?.toUpperCase() ?? '', [params.token])

  const [stage, setStage] = useState<Stage>('idle')
  const [reveal, setReveal] = useState(false)
  const [selectedBox, setSelectedBox] = useState<number | null>(null)

  const locker = useMemo(() => {
    if (!isLikelyToken(token)) return null
    return getLocker(token)
  }, [token])

  const alreadyOpened = Boolean(locker?.openedAtIso)
  const prize = locker ? getPrizeDefinition(locker.prizeId) : null

  async function openSelected(index: number) {
    if (!locker) return
    if (alreadyOpened) return
    if (stage !== 'idle') return
    setSelectedBox(index)

    setStage('opening')
    setReveal(true)

    // Suspense window – keep prize hidden during the wave.
    await delay(1700)
    markOpened(locker.token)
    await delay(250)

    setStage('opened')
    setReveal(false)
  }

  if (!locker) {
    return (
      <div className="min-h-dvh bg-blue-950 text-white">
        <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 text-center">
          <div className="relative w-full overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-8 shadow-2xl">
            <div className="mb-2 text-xs font-medium tracking-widest text-white/70">
              MYSTERY BOX
            </div>
            <h1 className="text-2xl font-semibold">Lien invalide</h1>
            <p className="mt-3 text-sm text-white/70">
              Ce casier n’existe pas (ou le lien est incomplet).
            </p>
            <Link
              to="/admin"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-blue-900"
            >
              Accéder au dashboard admin
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-blue-950 text-white">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 py-10">
        <div className="w-full">
          <div className="mb-4 text-center">
            <div className="text-xs font-medium tracking-widest text-white/70">
              MYSTERY BOX
            </div>
            <h1 className="mt-2 text-3xl font-semibold">Ouvrez un casier cadeau !</h1>
            <p className="mt-2 text-sm text-white/80">
              Clique sur un casier pour découvrir ton cadeau.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-b from-white/12 to-white/8 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm text-white/80">
                Casier&nbsp;: <span className="font-mono text-white">{token}</span>
              </div>
              {alreadyOpened ? (
                <span className="rounded-full bg-blue-400/20 px-3 py-1 text-xs font-medium text-white">
                  Déjà ouvert
                </span>
              ) : (
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90">
                  Scellé
                </span>
              )}
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-blue-950/50">
              {!alreadyOpened && stage === 'idle' && (
                <div className="absolute inset-0">
                  <div className="mb-ambient-glow rounded-full bg-white/10 blur-3xl" />
                  <div className="absolute inset-[-80px] rounded-full bg-blue-400/15 blur-3xl" />
                </div>
              )}

              {reveal && (
                <div className="mb-wave-overlay bg-gradient-to-b from-white/35 via-blue-300/25 to-transparent blur-[0.5px]" />
              )}

              {alreadyOpened || stage === 'opened' ? (
                <div className="relative z-10 grid place-items-center px-6 py-10 text-center">
                  <div className="text-xs font-medium tracking-widest text-white/70">
                    TON CADEAU
                  </div>
                  <div className="mt-3 text-2xl font-semibold">{prize?.label}</div>
                  <p className="mt-2 max-w-sm text-sm text-white/80">
                    Présente ce résultat à l’équipe du séminaire.
                  </p>
                </div>
              ) : (
                <div className="relative z-10 px-4 py-5 sm:px-6">
                  <div className="mb-4 text-center">
                    <div className="text-xs font-medium tracking-widest text-white/70">
                      CHOISIS TON CASIER
                    </div>
                    <p className="mt-2 text-sm text-white/80">
                      Clique un casier pour l’ouvrir.
                    </p>
                  </div>

                  <div className="mx-auto grid max-w-md grid-cols-3 gap-3">
                    {Array.from({ length: GRID_SIZE }).map((_, idx) => {
                      const isSelected = selectedBox === idx
                      const disabled = stage !== 'idle'

                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={disabled}
                          onClick={() => openSelected(idx)}
                          className={
                            'relative aspect-square overflow-hidden rounded-2xl border transition focus:outline-none ' +
                            (disabled
                              ? 'cursor-not-allowed border-white/10 bg-white/5 opacity-70'
                              : isSelected
                                ? 'border-white/50 bg-white/15 shadow-[0_0_0_6px_rgba(255,255,255,0.06)]'
                                : 'border-white/20 bg-white/10 hover:bg-white/15')
                          }
                          aria-label={`Casier ${idx + 1}`}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent" />
                          <div className="absolute inset-x-0 top-0 h-8 bg-white/10" />
                          <div className="absolute left-2 top-2 size-2 rounded-full bg-white/70" />

                          <div className="absolute inset-0 grid place-items-center">
                            <div
                              className={
                                'grid size-11 place-items-center rounded-2xl border border-white/20 bg-blue-500/60 shadow-lg ' +
                                (isSelected ? 'bg-blue-400/70' : '')
                              }
                            >
                              <svg
                                width="22"
                                height="22"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                              >
                                <path
                                  d="M7 11V8.8C7 6.15 9.15 4 11.8 4h.4C14.85 4 17 6.15 17 8.8V11"
                                  stroke="white"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M7.5 11h9A2.5 2.5 0 0 1 19 13.5v6A2.5 2.5 0 0 1 16.5 22h-9A2.5 2.5 0 0 1 5 19.5v-6A2.5 2.5 0 0 1 7.5 11Z"
                                  stroke="white"
                                  strokeWidth="2"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M12 15v3"
                                  stroke="white"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="absolute inset-0 ring-2 ring-white/60" />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-6 text-center">
                    {stage === 'opening' ? (
                      <>
                        <div className="text-xs font-medium tracking-widest text-white/70">
                          OUVERTURE EN COURS
                        </div>
                        <div className="mt-2 text-lg font-semibold">Suspense…</div>
                        <p className="mt-2 text-sm text-white/80">Ne ferme pas la page.</p>
                      </>
                    ) : (
                      <p className="text-xs text-white/70">
                        Astuce: choisis bien, ça s’ouvre immédiatement.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-center justify-between text-xs text-white/70">
              <span>Seminaire • AIESEC</span>
              <Link to="/admin" className="hover:text-white/90">
                Admin
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
