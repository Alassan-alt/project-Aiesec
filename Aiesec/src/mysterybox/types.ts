export type PrizeId =
  | 'KEYCHAIN'
  | 'PEN'
  | 'INTERNSHIP_10'
  | 'INTERNSHIP_5'
  | 'BOTTLE'
  | 'GOOD_LUCK'
  | 'KISS'

export type PrizeDefinition = {
  id: PrizeId
  label: string
  short: string
  baseCount: number
}

export type LockerRecord = {
  token: string
  prizeId: PrizeId
  createdAtIso: string
  openedAtIso?: string
}

export type MysteryBoxStateV1 = {
  version: 1
  lockers: Record<string, LockerRecord>
}
