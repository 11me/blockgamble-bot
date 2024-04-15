const { Job, Worker } = require("bullmq");
const { Redis } = require("ioredis");
const { Telegram } = require('telegraf');

/**
 * @param {string} queueName 
 * @param {Redis} redisConn
 * @param {Telegram} telegram 
*/
function newJoinRoomProcessor(queueName, redisConn, telegram) {
    const worker = new Worker(
        queueName,
        processJoinRoom(telegram),
        { connection: redisConn }
    );

    return worker;
}

/**
 * @param {Telegram} telegram
 * @returns {Function}
*/
function processJoinRoom(telegram) {
    /**
     * @param {Job} job - The job object to be processed.
     */
    return async function(job) {
        console.log('joining user', job.data);
        // get user from job data
        // find a room
        // deposit to the rooms pool from user wallet
        // send response that user joined the room
    }
}

module.exports = {
    newJoinRoomProcessor,
}
