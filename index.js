const config = require('./src/config');
const { newBot } = require('./src/bot');
const { newJoinRoomProcessor } = require('./src/worker');
const Redis = require("ioredis");
const database = require('./src/database');
const { Queue } = require('bullmq');
const { joinRoomQueueName } = require('./src/queue')

database.init(config.MONGO_URI, config.DB_NAME);

const redisConn = new Redis(config.REDIS_HOST, {
    maxRetriesPerRequest: null,
});

const joinRoomQueue = new Queue(joinRoomQueueName, { connection: redisConn });

const bot = newBot(config.BOT_TOKEN, joinRoomQueue);
const joinRoomWorker = newJoinRoomProcessor(joinRoomQueueName, redisConn, bot.telegram);

bot.launch();

process.once('SIGINT', async () => {
    console.info('Application is shutting down');
    bot.stop('SIGINT')
    await joinRoomWorker.close();
    await joinRoomQueue.close();
    await redisConn.quit();
    await database.close();
});
