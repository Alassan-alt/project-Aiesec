import { Collection, Db, MongoClient, ObjectId } from 'mongodb'

let client: MongoClient | null = null
let db: Db | null = null

export type PrizeId = string

export type PrizeDoc = {
  _id: PrizeId
  label: string
  short: string
  baseCount: number
  imageUrl?: string | null
  createdAt: Date
  updatedAt: Date
}

export type LockerDoc = {
  _id: string // token
  prizeId: PrizeId
  createdAt: Date
  openedAt?: Date | null
  userName?: string | null
  claimedAt?: Date | null
  selectedIdx?: number | null
}

export type AdminUserDoc = {
  _id?: ObjectId
  username: string
  passwordHash: string
  createdAt: Date
  updatedAt: Date
}

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI
  if (!uri || uri.trim().length < 10) {
    throw new Error('MONGODB_URI must be set')
  }
  return uri
}

function getMongoDbName(): string {
  return (process.env.MONGODB_DB || 'aiesec_mysterybox').trim() || 'aiesec_mysterybox'
}

export async function connectDb(): Promise<Db> {
  if (db) return db

  client = new MongoClient(getMongoUri())
  await client.connect()
  db = client.db(getMongoDbName())

  const prizes = db.collection<PrizeDoc>('prizes')
  const lockers = db.collection<LockerDoc>('lockers')
  const adminUsers = db.collection<AdminUserDoc>('adminUsers')

  await Promise.all([
    adminUsers.createIndex({ username: 1 }, { unique: true }),
    lockers.createIndex({ openedAt: 1 }),
    lockers.createIndex({ prizeId: 1 }),
  ])

  return db
}

export function getDb(): Db {
  if (!db) {
    throw new Error('DB not connected. Call connectDb() during server startup.')
  }
  return db
}

export function collections(): {
  prizes: Collection<PrizeDoc>
  lockers: Collection<LockerDoc>
  adminUsers: Collection<AdminUserDoc>
} {
  const database = getDb()
  return {
    prizes: database.collection<PrizeDoc>('prizes'),
    lockers: database.collection<LockerDoc>('lockers'),
    adminUsers: database.collection<AdminUserDoc>('adminUsers'),
  }
}
