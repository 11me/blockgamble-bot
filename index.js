const config = require('./src/config');
const { newBot } = require('./src/bot');
const { processJoinRoom, startActiveRoomPublisher, processActiveRoom, processSendTelegramMessage } = require('./src/worker');
const Redis = require("ioredis");
const database = require('./src/database');
const { Queue, Worker } = require('bullmq');
const { joinRoomQueueName, activeRoomQueueName, telegramMessageQueueName } = require('./src/queue')

database.init(config.MONGO_URI, config.DB_NAME);

const redisConn = new Redis(config.REDIS_HOST, {
    maxRetriesPerRequest: null,
});

const joinRoomQueue = new Queue(joinRoomQueueName, { connection: redisConn });

const bot = newBot(config.BOT_TOKEN, joinRoomQueue);

const joinRoomWorker = new Worker(
    joinRoomQueueName,
    processJoinRoom(bot.telegram),
    { connection: redisConn }
);

const telegramQueue = new Queue(telegramMessageQueueName, { connection: redisConn });
const telegramWorker = new Worker(telegramMessageQueueName,
    processSendTelegramMessage(bot.telegram),
    {
        limiter: { max: 30, duration: 1000 },
        connection: redisConn,
    }
);

const activeRoomsQueue = new Queue(activeRoomQueueName, { connection: redisConn });
const publisherID = startActiveRoomPublisher(activeRoomQueueName, activeRoomsQueue, 5000);
const activeRoomWorker = new Worker(
    activeRoomQueueName,
    processActiveRoom(telegramQueue),
    { connection: redisConn }
);

bot.launch();

process.once('SIGINT', async () => {
    console.info('Application is shutting down');
    bot.stop('SIGINT')

    await joinRoomWorker.close();
    await joinRoomQueue.close();

    clearInterval(publisherID);
    await activeRoomsQueue.close();
    await activeRoomWorker.close();

    await telegramQueue.close();
    await telegramWorker.close();

    await redisConn.quit();
    await database.close();
});
