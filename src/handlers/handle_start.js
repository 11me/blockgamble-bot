const { Context } = require('telegraf');
const database = require('../database');
const { Queue } = require('bullmq');
const { joinRoomQueueName } = require('../queue');

const Action = {
    Deposit: "start_deposit",
    Wallet: "start_wallet",
    FindRoom: "start_find_room",
    Support: "start_support",
}

const startKeyboard = [
    [{ text: "💳 Deposit", callback_data: Action.Deposit }],
    [{ text: "💼 Wallet", callback_data: Action.Wallet }],
    [{ text: "🔍 Find room", callback_data: Action.FindRoom }],
    [{ text: "📞 Support", callback_data: Action.Support }],
]

const welcomeMessage = (name) => {
    return `Welcome, ${name}, to the funniest Telegram Casino!
Ready to win 🤑? 
In <b>Casino</b> players deposit money into a virtual casino room. A random player loses, and their money goes to others based on deposits.
Notifications share wins or losses. The excitement continues as players plan for the next round.

Deposits function only in BTC!`
};

/**
 * Handle /start.
 * @param {Context} ctx - Telegram context.
 */
async function handleStart(ctx) {
    await database.saveUser({
        user_id: ctx.message.from.id,
        username: ctx.message.from.username,
        wallet: {
            balance: 0,
            wallet_addr: 'abc',
        }
    });
    await ctx.reply(
        welcomeMessage(ctx.message.from.first_name),
        {
            reply_markup: { inline_keyboard: startKeyboard },
            parse_mode: 'HTML',
        }
    );
};

/**
 * Handle support button.
 * @param {Context} ctx - Telegram context.
 */
async function handleSupportAction(ctx) {
    await ctx.reply(`Fot getting help please contact @limerc`);
};

/**
 * Handle deposit button.
 * @param {Context} ctx - Telegram context.
 */
async function handleDepositAction(ctx) {
    //TODO: show user his wallet address
    const user = await database.getUser(ctx.callbackQuery.from.id);
    user.wallet.balance += 100;
    await database.updateUser(user);
    await ctx.reply(`💰 You got 100 coins!`);
};

/**
 * Handle wallet button.
 * @param {Context} ctx - Telegram context.
 */
async function handleWalletAction(ctx) {
    await ctx.reply(`not implemented yet`);
};

/**
 * Handle find room button.
 * @param {Context} ctx - Telegram context.
 */
async function handleFindRoomAction(ctx) {
    // find free room
    await ctx.reply(`🔍 Looking for a room...`);
    const rooms = await database.findAvailableRooms();
    if (rooms.length === 0) {
        const room = await database.saveRoom({
            pool: {
                amount: 0,
                symbol: '$DEGEN',
            },
            players: [],
            win_rate: 0.98,
            capacity: 2,
            min_deposit: 100,
            state: 'open',
        });
        //TODO: fix
        const [text, kb] = renderRoomsWithKeyboard([room]);
        await ctx.replyWithHTML(text, {
            reply_markup: {
                inline_keyboard: kb,
            }
        })
        return;
    }

    const [text, kb] = renderRoomsWithKeyboard(rooms);
    await ctx.replyWithHTML(text, { reply_markup: { inline_keyboard: kb } });
};


/**
 * @param {Room[]} rooms
 * @returns {string}
 */
function renderRoomsWithKeyboard(rooms) {
    let text = ``;
    const keyboard = [];
    rooms.forEach((room, idx) => {
        text += `🚪 Room: ${idx + 1}
📈 Win rate: ${room.win_rate * 100}%
👥 Players: ${room.players.length}/${room.capacity}
💰 Pool: ${room.pool.amount} ${room.pool.symbol}
💵 Required Deposit: ${room.min_deposit}

`
        keyboard.push([{ text: `🎮 Join room: ${idx + 1}`, callback_data: `join_${room._id}` }])
    });
    return [text, keyboard];
}

/**
 * @param {Queue} queue 
 */
function handleJoinRoomAction(queue) {
    /**
     * @param {Context} ctx
     */
    return async function(ctx) {
        const user_id = ctx.update.callback_query.from.id;
        const user = await database.getUser(user_id);

        if (user.room_id) {
            await ctx.reply('You already joined the room :)');
            return;
        }

        const room_id = ctx.update.callback_query.data.split('_')[1];
        await queue.add(joinRoomQueueName, { user_id, room_id })
    }
}


module.exports = {
    Action,
    handleStart,
    handleSupportAction,
    handleWalletAction,
    handleFindRoomAction,
    handleDepositAction,
    handleJoinRoomAction,
}
