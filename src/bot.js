const { Telegraf } = require('telegraf');
const {
    Action,
    handleStart,
    handleSupportAction,
    handleDepositAction,
    handleFindRoomAction,
    handleWalletAction,
    handleJoinRoomAction,
} = require('./handlers/handle_start');
const { errorMiddleware } = require('./handlers/error_middleware');
const { Queue } = require('bullmq');

/**
 * @param {string} token 
 * @param {Queue} queue 
 */
function newBot(token, queue) {
    const bot = new Telegraf(token);
    bot.use(errorMiddleware);
    bot.start(handleStart);
    bot.action(Action.Support, handleSupportAction);
    bot.action(Action.Deposit, handleDepositAction);
    bot.action(Action.FindRoom, handleFindRoomAction);
    bot.action(Action.Wallet, handleWalletAction);
    bot.action(/join_.+/, handleJoinRoomAction(queue));
    return bot;
}

module.exports = {
    newBot,
}
