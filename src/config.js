require('dotenv').config()

module.exports = {
    BOT_TOKEN: process.env.BOT_TOKEN,
    MONGO_URI: process.env.MONGO_URI,
    DB_NAME: process.env.DB_NAME,
    REDIS_HOST: process.env.REDIS_HOST,
}
