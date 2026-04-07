import { MongoClient } from 'mongodb';
let client = null;
let db = null;
function getMongoUri() {
    const uri = process.env.MONGODB_URI;
    if (!uri || uri.trim().length < 10) {
        throw new Error('MONGODB_URI must be set');
    }
    return uri;
}
function getMongoDbName() {
    return (process.env.MONGODB_DB || 'aiesec_mysterybox').trim() || 'aiesec_mysterybox';
}
export async function connectDb() {
    if (db)
        return db;
    client = new MongoClient(getMongoUri());
    await client.connect();
    db = client.db(getMongoDbName());
    const prizes = db.collection('prizes');
    const lockers = db.collection('lockers');
    const adminUsers = db.collection('adminUsers');
    await Promise.all([
        adminUsers.createIndex({ username: 1 }, { unique: true }),
        lockers.createIndex({ openedAt: 1 }),
        lockers.createIndex({ prizeId: 1 }),
    ]);
    return db;
}
export function getDb() {
    if (!db) {
        throw new Error('DB not connected. Call connectDb() during server startup.');
    }
    return db;
}
export function collections() {
    const database = getDb();
    return {
        prizes: database.collection('prizes'),
        lockers: database.collection('lockers'),
        adminUsers: database.collection('adminUsers'),
    };
}
