const { Job, Queue } = require("bullmq");
const { Telegram, session } = require('telegraf');
const { telegramMessageQueueName } = require('./queue');
const database = require('./database');

/**
 * @param {Telegram} telegram
 * @returns {Function}
*/
function processJoinRoom(telegram) {
    /**
     * @param {Job} job
     */
    return async function(job) {
        // get user from job data
        const { user_id, room_id } = job.data;
        // find a room
        await database.withTransaction(async (session) => {
            const room = await database.getRoom(room_id, session);
            const user = await database.getUser(user_id, session);

            if (room.players && room.players.length === room.capacity) {
                // room already full
                await telegram.sendMessage(user_id, `Oops, room is already full, please try another one.`)
                return;
            }

            if (user.wallet.balance < room.min_deposit) {
                await telegram.sendMessage(user_id, `⛔ You need a sufficient balance to join this room.`)
                return;
            }


            // deposit to the rooms pool from user wallet
            user.wallet.balance -= room.min_deposit;
            room.pool.amount += room.min_deposit;

            user.room_id = room._id;
            room.players.push(user_id);

            if (room.players.length === room.capacity) {
                room.state = 'active';
            }

            await database.updateUser(user, session);
            await database.updateRoom(room, session);

            // send response that user joined the room
            await telegram.sendMessage(
                user_id,
                `You joined the room
Wait for the results :)
`
            );
        })
    }
}

/**
 * @param {Queue} queue
 * @param {string} queueName 
 * @param {number} interval 
 * @returns {number}
*/
function startActiveRoomPublisher(queueName, queue, interval) {
    const id = setInterval(async () => {
        const rooms = await database.findActiveRooms();
        if (rooms.length === 0) {
            console.info('publisher: no active rooms found');
            return;
        }
        const ids = rooms.map(room => room._id.toString());
        await database.withTransaction(async (session) => {
            await database.updateRooms(ids,
                { $set: { state: 'processing' } },
                session,
            )
            for (const room of rooms) {
                await queue.add(queueName, room);
            }
        })
    }, interval);

    return id;
}

/**
 * @param {Queue} telegramMessageQueue
 * @returns {Function}
*/
function processActiveRoom(telegramMessageQueue) {
    return async function(job) {
        const room = job.data;
        if (Reflect.ownKeys(room).length === 0) {
            console.log('room keys', job.data);
            return;
        }
        // randomly pick players by win rate who will lose
        const losersCount = room.players.length - Math.floor(room.win_rate * room.players.length);
        const loserIDs = [];
        for (let i = 0; i < losersCount; i++) {
            loserIDs.push(
                room.players[Math.floor(Math.random() * room.players.length)]
            );
        }
        await database.withTransaction(async (session) => {
            // spread the pool among users
            const losers = await database.listUsersByIDs(loserIDs, session);
            // calculate the bonus for each user
            const bonus = (room.pool.amount / (room.players.length - losers.length)).toPrecision(12);
            // add to the queue to fill user balance
            const winnerIds = room.players.filter(playerId => !losers.some(loser => playerId === loser.user_id));
            //TODO fiction balance
            // create method to check the user balance in blockchain
            // and update transfer the money to its blockchain address instead of making the update in database
            await database.updateUsers(winnerIds,
                {
                    $inc: { 'wallet.balance': parseFloat(bonus) },
                },
                session
            );
            await database.updateUsers(room.players,
                {
                    $unset: { room_id: '' },
                },
                session
            );
            // close the room
            room.state = 'closed';
            await database.updateRoom(room, session);
            // announce the winners and losers in different queue
            winnerIds.forEach(async (user_id) => {
                await telegramMessageQueue.add(telegramMessageQueueName, {
                    user_id,
                    message: `You won!`,
                });
            });

            losers.forEach(async (loser) => {
                await telegramMessageQueue.add(telegramMessageQueueName, {
                    user_id: loser.user_id,
                    message: `You lose!`,
                });
            });
        });
    }
}

/**
 * @param {Telegram} telegram
 * @returns {Function}
*/
function processSendTelegramMessage(telegram) {
    return async function(job) {
        // data should contain {user_id, message}
        const { user_id, message } = job.data;
        await telegram.sendMessage(user_id, message);
    }
}

module.exports = {
    processJoinRoom,
    processActiveRoom,
    processSendTelegramMessage,
    startActiveRoomPublisher,
}
