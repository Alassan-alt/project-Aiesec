import type { PrizeId } from './db.js'

export type PrizeSeed = {
  id: PrizeId
  label: string
  short: string
  baseCount: number
}

export const DEFAULT_PRIZES: PrizeSeed[] = [
  { id: 'KEYCHAIN', label: 'Porte-clés personnalisé', short: 'Porte-clés', baseCount: 10 },
  { id: 'PEN', label: 'Stylo personnalisé', short: 'Stylo', baseCount: 10 },
  { id: 'INTERNSHIP_10', label: 'Opportunité de stage (-10%)', short: 'Stage -10%', baseCount: 100 },
  { id: 'INTERNSHIP_5', label: 'Réduction stage (-5%)', short: 'Stage -5%', baseCount: 250 },
  { id: 'BOTTLE', label: 'Gourde personnalisée', short: 'Gourde', baseCount: 1 },
  { id: 'GOOD_LUCK', label: 'Bonne chance', short: 'Bonne chance', baseCount: 400 },
  { id: 'KISS', label: 'Bisou', short: 'Bisou', baseCount: 30 },
]
