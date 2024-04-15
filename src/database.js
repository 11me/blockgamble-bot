require('./types');

const { MongoClient, Db, ClientSession } = require("mongodb");

/**
 * MongoDB Db instance.
 * @type {Db}
 */
let db;

/**
 * MongoDB client instance.
 * @type {MongoClient}
 */
let client;

/**
 * Initialize database.
 * @param {string} connStr - connection string.
 * @param {string} dbName - database name.
 */
function init(connStr, dbName) {
    if (!connStr) throw new Error('connection string is required')
    if (!dbName) throw new Error('database name is required')

    if (!client) {
        client = new MongoClient(connStr);
    }
    if (!db) {
        db = client.db(dbName);
    }
}

async function close() {
    if (!client) return;
    await client.close()
}

async function withTransaction(callback) {
    const session = client.startSession()
    await session.withTransaction(async () => {
        try {
            await callback(session);
        } catch (err) {
            console.error('database transaction failed', err)
        } finally {
            await session.endSession();
        }
    })
}

/**
 * @param {User} user
 * @param {ClientSession} [session]
 */
async function saveUser(user, session) {
    const coll = db.collection('users');
    await coll.updateOne(
        { user_id: user.user_id },
        { $setOnInsert: user },
        { upsert: true, session }
    );
}

/**
 * @returns {Promise<Room[]>}
 */
async function findAvailableRooms() {
    const coll = db.collection('rooms');
    const rooms = coll.find({
        $expr: {
            $lt: [{ $size: "$players" }, "$capacity"]
        }
    });
    return await rooms.toArray();
}

/**
 * @param {Room} room 
 * @param {ClientSession} session 
 * @returns {Promise<Room>}
 */
async function saveRoom(room, session) {
    const coll = db.collection('rooms');
    const res = await coll.insertOne(room, { session });
    return { _id: res.insertedId, ...room }
}

module.exports = {
    init,
    saveUser,
    findAvailableRooms,
    saveRoom,
    close,
}
