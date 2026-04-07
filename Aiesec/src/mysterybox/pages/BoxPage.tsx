import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { claimLockerName, getPublicLocker, openLocker } from '../api'
import { isLikelyToken } from '../token'
import type { PrizeId } from '../types'

type Stage = 'idle' | 'opening' | 'opened'

const GRID_SIZE = 9

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fireConfettiCannon() {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReducedMotion) return

  const base = {
    particleCount: 70,
    spread: 55,
    startVelocity: 45,
    ticks: 200,
    scalar: 1,
    zIndex: 9999,
  }

  // Two side cannons.
  confetti({ ...base, angle: 60, origin: { x: 0, y: 0.8 } })
  confetti({ ...base, angle: 120, origin: { x: 1, y: 0.8 } })

  // A small center burst to sell the “opening” moment.
  setTimeout(() => {
    confetti({
      ...base,
      particleCount: 35,
      spread: 90,
      startVelocity: 32,
      origin: { x: 0.5, y: 0.65 },
    })
  }, 150)
}

function PrizeIllustration({ prizeId }: { prizeId: PrizeId }) {
  const frameClass =
    'mx-auto grid size-32 place-items-center rounded-3xl border border-slate-200/60 bg-white/70 shadow-sm'
  const iconClass = 'size-16'

  switch (prizeId) {
    case 'GOOD_LUCK':
      return (
        <div className={frameClass} aria-label="Oups">
          <svg
            viewBox="0 0 128 128"
            className={iconClass}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M64 12c-20.4 0-37 16.6-37 37v18c0 20.4 16.6 37 37 37s37-16.6 37-37V49c0-20.4-16.6-37-37-37Z"
              className="fill-amber-100 stroke-amber-300"
              strokeWidth="4"
            />
            <path
              d="M47 57c0 4-3 7-7 7s-7-3-7-7 3-7 7-7 7 3 7 7Zm55 0c0 4-3 7-7 7s-7-3-7-7 3-7 7-7 7 3 7 7Z"
              className="fill-slate-700"
            />
            <path
              d="M47 83c5-6 10-9 17-9s12 3 17 9"
              className="stroke-slate-700"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M28 32l14-8M100 32l-14-8"
              className="stroke-amber-400"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )

    case 'KEYCHAIN':
      return (
        <div className={frameClass} aria-label="Porte-clés">
          <svg
            viewBox="0 0 128 128"
            className={iconClass}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <circle
              cx="54"
              cy="50"
              r="20"
              className="stroke-sky-500"
              strokeWidth="8"
            />
            <circle
              cx="54"
              cy="50"
              r="8"
              className="stroke-slate-300"
              strokeWidth="6"
            />
            <path
              d="M68 62l28 28c4 4 4 10 0 14s-10 4-14 0L54 76"
              className="stroke-slate-700"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M98 86l-8 8"
              className="stroke-amber-400"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )

    case 'PEN':
      return (
        <div className={frameClass} aria-label="Stylo">
          <svg
            viewBox="0 0 128 128"
            className={iconClass}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M30 98l10-32 44-44c5-5 13-5 18 0s5 13 0 18L58 84 30 98Z"
              className="fill-sky-200 stroke-sky-600"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M74 30l24 24"
              className="stroke-slate-700"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M40 66l22 22"
              className="stroke-amber-400"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )

    case 'BOTTLE':
      return (
        <div className={frameClass} aria-label="Gourde">
          <svg
            viewBox="0 0 128 128"
            className={iconClass}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M52 18h24v10c0 6-4 10-10 10H62c-6 0-10-4-10-10V18Z"
              className="fill-slate-200 stroke-slate-400"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M46 38h36v58c0 10-8 18-18 18h0c-10 0-18-8-18-18V38Z"
              className="fill-sky-200 stroke-sky-600"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M54 66h20"
              className="stroke-amber-400"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )

    case 'INTERNSHIP_10':
    case 'INTERNSHIP_5':
      return (
        <div className={frameClass} aria-label="Réduction stage">
          <svg
            viewBox="0 0 128 128"
            className={iconClass}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M26 44c0-6 5-10 10-10h56c6 0 10 4 10 10v40c0 6-4 10-10 10H36c-5 0-10-4-10-10V44Z"
              className="fill-white stroke-slate-300"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M26 54h76"
              className="stroke-sky-600"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M40 70h34"
              className="stroke-slate-700"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d="M40 84h22"
              className="stroke-amber-400"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <path
              d={prizeId === 'INTERNSHIP_10' ? 'M90 82c0 6-5 10-10 10s-10-4-10-10 5-10 10-10 10 4 10 10Z' : 'M94 82c0 8-7 14-14 14s-14-6-14-14 7-14 14-14 14 6 14 14Z'}
              className="fill-amber-200 stroke-amber-500"
              strokeWidth="6"
            />
          </svg>
        </div>
      )

    case 'KISS':
      return (
        <div className={frameClass} aria-label="Bisou">
          <svg
            viewBox="0 0 128 128"
            className={iconClass}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M64 108s-34-20-34-46c0-14 11-24 24-24 6 0 12 3 16 7 4-4 10-7 16-7 13 0 24 10 24 24 0 26-34 46-34 46Z"
              className="fill-amber-200 stroke-amber-400"
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <path
              d="M42 62c6 0 10 6 22 6s16-6 22-6"
              className="stroke-slate-700"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )
  }
}

export function BoxPage() {
  const params = useParams()
  const token = useMemo(() => params.token?.toUpperCase() ?? '', [params.token])

  const [stage, setStage] = useState<Stage>('idle')
  const [selectedBox, setSelectedBox] = useState<number | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [locker, setLocker] = useState<Awaited<ReturnType<typeof getPublicLocker>> | null>(
    null,
  )

  useEffect(() => {
    setStage('idle')
    setSelectedBox(null)
    setNameInput('')
    setNameTouched(false)
    setActionError(null)
    setSavingName(false)
    setLoading(true)
    setNotFound(false)
    setLocker(null)
  }, [token])

  useEffect(() => {
    let cancelled = false

    async function run() {
      if (!isLikelyToken(token)) {
        if (!cancelled) {
          setNotFound(true)
          setLoading(false)
        }
        return
      }

      try {
        const l = await getPublicLocker(token)
        if (cancelled) return
        setLocker(l)
        setLoading(false)
      } catch {
        if (cancelled) return
        setNotFound(true)
        setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [token])

  const alreadyOpened = Boolean(locker?.openedAt)
  const prize = locker?.prize ?? null

  const hasName = Boolean(locker?.userName && locker.userName.trim().length > 0)
  const canPick = Boolean(locker) && !alreadyOpened && stage === 'idle' && hasName
  const normalizedNameInput = nameInput.trim().replace(/\s+/g, ' ')
  const canSubmitName = normalizedNameInput.length >= 2 && normalizedNameInput.length <= 60

  async function openSelected(index: number) {
    if (!locker) return
    if (alreadyOpened) return
    if (stage !== 'idle') return
    if (!hasName) return
    setActionError(null)
    setSelectedBox(index)

    setStage('opening')
    fireConfettiCannon()

    // Suspense window – keep prize hidden during the wave.
    await delay(1700)
    try {
      const opened = await openLocker(locker.token, index)
      setLocker(opened)
    } catch {
      // Fallback: refresh state from API.
      try {
        const l = await getPublicLocker(locker.token)
        setLocker(l)
      } catch {
        setActionError("Impossible d’ouvrir le casier. Vérifiez votre connexion et réessayez.")
      }
    }
    await delay(250)

    setStage('opened')
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-slate-100 text-slate-900">
        <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-8">
          <header className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Mystery Box</div>
          </header>

          <main className="flex flex-1 items-center justify-center">
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="text-xs font-semibold tracking-widest text-slate-500">MYSTERY BOX</div>
              <h1 className="mt-3 text-2xl font-semibold text-slate-800">Chargement…</h1>
              <p className="mt-2 text-sm text-slate-600">Préparation de votre casier.</p>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (notFound || !locker) {
    return (
      <div className="min-h-dvh bg-slate-100 text-slate-900">
        <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-8">
          <header className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Mystery Box</div>
            <Link to="/admin" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
              Admin
            </Link>
          </header>

          <main className="flex flex-1 items-center justify-center">
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="text-xs font-semibold tracking-widest text-slate-500">MYSTERY BOX</div>
              <h1 className="mt-3 text-3xl font-semibold text-slate-800">Lien invalide</h1>
              <p className="mt-3 text-sm text-slate-600">
                Ce casier n’existe pas (ou le lien est incomplet).
              </p>

              <Link
                to="/admin"
                className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Accéder au dashboard admin
              </Link>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5 py-8">
        <header className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-800">Mystery Box</div>
          <div className="text-xs text-slate-500">
            ID&nbsp;: <span className="font-mono text-slate-700">{token}</span>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center">
          <div className="w-full">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-center">
                <h1 className="text-3xl font-semibold text-slate-800">Ouvrez un casier cadeau</h1>
                <p className="mt-2 text-sm text-slate-600">
                  Cliquez sur un casier pour découvrir votre cadeau.
                </p>
              </div>

              {actionError && (
                <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                  {actionError}
                </div>
              )}

              {!alreadyOpened && stage === 'idle' && !hasName && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold tracking-widest text-slate-500">ÉTAPE 1</div>
                  <h2 className="mt-2 text-lg font-semibold text-slate-800">Votre nom</h2>
                  <p className="mt-1 text-sm text-slate-600">Ce lien est utilisable une seule fois.</p>

                  <form
                    className="mt-3 flex flex-col gap-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      setNameTouched(true)
                      if (!canSubmitName) return
                      void (async () => {
                        setActionError(null)
                        setSavingName(true)
                        try {
                          await claimLockerName(locker.token, normalizedNameInput)
                          const l = await getPublicLocker(locker.token)
                          setLocker(l)
                        } catch {
                          setActionError(
                            "Impossible d’enregistrer votre nom. Vérifiez votre connexion et réessayez.",
                          )
                        } finally {
                          setSavingName(false)
                        }
                      })()
                    }}
                  >
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onBlur={() => setNameTouched(true)}
                      placeholder="Ex: Souleymane"
                      autoComplete="name"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none focus:border-sky-300"
                    />

                    {nameTouched && !canSubmitName && (
                      <div className="text-xs text-rose-600">
                        Entrez un nom (2–60 caractères).
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!canSubmitName || savingName}
                      className={
                        'inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold shadow transition ' +
                        (!canSubmitName || savingName
                          ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                          : 'bg-blue-600 text-white hover:bg-blue-700')
                      }
                    >
                      {savingName ? 'Enregistrement…' : 'Continuer'}
                    </button>
                  </form>
                </div>
              )}

              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4">
                  {alreadyOpened || stage === 'opened' ? (
                    <div className="relative z-10 grid place-items-center px-4 py-10 text-center">
                      <div className="text-xs font-semibold tracking-widest text-slate-500">
                        VOTRE CADEAU
                      </div>
                      <div className="mt-5">
                        {prize?.imageUrl && prize.id !== 'GOOD_LUCK' ? (
                          <div className="mx-auto grid size-32 place-items-center overflow-hidden rounded-3xl border border-slate-200/60 bg-white/70 shadow-sm">
                            <img
                              src={prize.imageUrl}
                              alt={prize.label}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <PrizeIllustration prizeId={(prize?.id ?? 'GOOD_LUCK') as PrizeId} />
                        )}
                      </div>
                      <div className="mt-3 text-2xl font-semibold text-slate-700">
                        {prize?.label ?? '—'}
                      </div>
                      {prize?.id === 'GOOD_LUCK' && (
                        <p className="mt-2 max-w-sm text-sm text-slate-600">
                          Oups… vous aurez plus de chance la prochaine fois.
                        </p>
                      )}
                      <p className="mt-2 max-w-sm text-sm text-slate-600">
                        Présentez ce résultat à l’équipe du séminaire.
                      </p>
                      {locker?.userName && (
                        <div className="mt-4 text-xs text-slate-500">
                          Nom&nbsp;: <span className="font-semibold text-slate-700">{locker.userName}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative z-10 px-2 py-3 sm:px-4">
                      <div className="mb-3 text-center">
                        <div className="text-xs font-semibold tracking-widest text-slate-500">ÉTAPE 2</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">Choisissez un casier</div>
                      </div>

                      {!alreadyOpened && stage === 'idle' && !hasName && (
                        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          Entrez d’abord votre nom pour débloquer les casiers.
                        </div>
                      )}

                      <div className="mx-auto grid max-w-md grid-cols-3 gap-3">
                        {Array.from({ length: GRID_SIZE }).map((_, idx) => {
                          const isSelected = selectedBox === idx
                          const disabled = !canPick

                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={disabled}
                              onClick={() => openSelected(idx)}
                              className={
                                'group relative aspect-square overflow-hidden rounded-2xl border transition focus:outline-none ' +
                                (disabled
                                  ? 'cursor-not-allowed border-slate-200/60 bg-slate-100/70 opacity-70'
                                  : isSelected
                                    ? 'border-blue-300 bg-gradient-to-b from-sky-400 via-sky-500 to-blue-600 ring-2 ring-blue-300/40'
                                    : 'border-slate-200 bg-gradient-to-b from-sky-300 via-sky-500 to-blue-600 hover:from-sky-300 hover:via-sky-400 hover:to-blue-600')
                              }
                              aria-label={`Casier ${idx + 1}`}
                            >
                              <div className="absolute inset-0 bg-gradient-to-br from-white/35 via-white/10 to-transparent" />
                              <div className="absolute inset-x-0 top-0 h-8 bg-white/15" />
                              <div className="absolute left-2 top-2 size-2 rounded-full bg-white/70" />

                              <div className="absolute left-2 top-2">
                                <svg
                                  viewBox="0 0 24 24"
                                  width="14"
                                  height="14"
                                  fill="currentColor"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="text-amber-400 drop-shadow"
                                  aria-hidden="true"
                                >
                                  <path d="M12 2l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6L12 16.9 6.2 19.8l1.6-6.6-5.2-4.4 6.8-.5L12 2Z" />
                                </svg>
                              </div>

                              <div className="absolute inset-0 grid place-items-center">
                                <div className="grid size-12 place-items-center">
                                  <svg
                                    width="28"
                                    height="28"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                  >
                                    <path
                                      d="M8 11V8.8C8 6.7 9.7 5 11.8 5h.4C14.3 5 16 6.7 16 8.8V11"
                                      className="stroke-slate-200"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                    <path
                                      d="M7.2 11h9.6A2.8 2.8 0 0 1 19.6 13.8v5.6A2.6 2.6 0 0 1 17 22H7A2.6 2.6 0 0 1 4.4 19.4v-5.6A2.8 2.8 0 0 1 7.2 11Z"
                                      className="fill-amber-400 stroke-amber-500"
                                      strokeWidth="1"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M12 15.2v3"
                                      className="stroke-amber-900"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </div>
                              </div>

                              {!disabled && !isSelected && (
                                <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                                  <div className="absolute inset-0 bg-white/20" />
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      <div className="mt-5 text-center">
                        {stage === 'opening' ? (
                          <>
                            <div className="text-xs font-semibold tracking-widest text-slate-500">
                              OUVERTURE EN COURS
                            </div>
                            <div className="mt-2 text-lg font-semibold text-slate-700">
                              Suspense…
                            </div>
                            <p className="mt-2 text-sm text-slate-600">Ne fermez pas la page.</p>
                          </>
                        ) : (
                          <p className="text-xs text-slate-500">Cliquez sur un casier pour l’ouvrir.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="pb-5 text-center text-xs text-slate-400">
          {alreadyOpened ? (
            <span>Ce casier a déjà été ouvert.</span>
          ) : (
            <span>&nbsp;</span>
          )}
        </footer>
      </div>
    </div>
  )
}
