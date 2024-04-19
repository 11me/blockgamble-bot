require('./types');

const { MongoClient, Db, ClientSession, ObjectId } = require("mongodb");

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

/**
 * @callback Callback
 * @param {ClientSession} session
 * @returns {Promise<void>}
 */

/**
 * @param {Callback} callback
 */
async function withTransaction(callback) {
    const session = client.startSession()
    await session.withTransaction(async () => {
        try {
            await callback(session);
            await session.commitTransaction()
        } catch (err) {
            console.error('database transaction failed', err)
            await session.abortTransaction();
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
 * @param {User[]} user
 * @param {number[]} ids 
 * @param {ClientSession} [session]
 * @returns {Promise<User[]>}
 */
async function listUsersByIDs(ids, session) {
    const coll = db.collection('users');
    return coll.find(
        { user_id: { $in: ids } },
        null,
        { session }
    ).toArray();
}

/**
 * @returns {Promise<Room[]>}
 */
async function findActiveRooms() {
    const coll = db.collection('rooms');
    const rooms = coll.find({ state: 'active' });
    return await rooms.toArray();
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
 * @param {ClientSession} [session]
 * @returns {Promise<Room>}
 */
async function saveRoom(room, session) {
    const coll = db.collection('rooms');
    const res = await coll.insertOne(room, { session });
    return { _id: res.insertedId, ...room }
}

/**
 * @param {string} room_id
 * @param {ClientSession} [session]
 * @returns {Promise<Room> | null}
 */
async function getRoom(room_id, session) {
    const coll = db.collection('rooms');
    return await coll.findOne({ _id: new ObjectId(room_id) }, { session });
}

/**
 * @param {Room} room
 * @param {ClientSession} [session]
 * @returns {Promise<void>}
 */
async function updateRoom(room, session) {
    const coll = db.collection('rooms');
    const {_id, ...updateRoom } = room;
    await coll.updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateRoom },
        { session }
    );
}

/**
 * @param {ObjectId[] | string[]} ids
 * @param {any} update
 * @param {ClientSession} [session]
 */
async function updateRooms(ids, update, session) {
    const coll = db.collection('rooms');
    await coll.updateMany(
        {_id: {$in: ids.map(id => toObjectId(id))}},
        update,
        {session}
    );
}

/**
 * @param {string} room_id
 * @param {ClientSession} [session]
 * @returns {Promise<User> | null}
 */
async function getUser(user_id, session) {
    const coll = db.collection('users');
    return await coll.findOne({ user_id }, { session });
}

/**
 * @param {User} user
 * @param {ClientSession} [session]
 * @returns {Promise<void>}
 */
async function updateUser(user, session) {
    const coll = db.collection('users');
    await coll.updateOne(
        { user_id: user.user_id },
        { $set: user },
        { session }
    );
}

/**
 * @param {number[]} ids 
 * @param {Object} update 
 * @param {ClientSession} [session]
 */
async function updateUsers(ids, update, session) {
    const coll = db.collection('users');
    await coll.updateMany(
        { user_id: { $in: ids } },
        update,
        { session }
    )
}

/**
 * @param {ObjectId | string} _id 
 * @returns {ObjectId}
 */

function toObjectId(_id) {
    if (typeof _id === 'string') {
        return new ObjectId(_id);
    }

    return _id;
}

module.exports = {
    init,
    withTransaction,
    saveUser,
    findAvailableRooms,
    saveRoom,
    getRoom,
    updateRoom,
    updateRooms,
    findActiveRooms,
    listUsersByIDs,
    getUser,
    updateUser,
    updateUsers,
    close,
}
