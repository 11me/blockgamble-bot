/**
 * @typedef {Object} Wallet
 * @property {string} wallet_addr - The wallet address.
 * @property {number} balance - The wallet balance.
 */


/**
 * @typedef {Object} User
 * @property {number} user_id - The user ID.
 * @property {string} first_name - The user's name.
 * @property {string} [username] - The user's username (optional).
 * @property {string} [room_id] - The ID of the room user currently in.
 * @property {Wallet} wallet - The user's wallet.
 */

/**
 * @typedef {Object} Pool
 * @property {number} amount - Pool amount.
 * @property {string} symbol - Symbol: BTC, ETH, TON, etc.
 */

/**
 * @typedef {Object} Player
 * @property {string} display_name - The fake name of the user when joining the room.
 * @property {number} user_id
 */

/**
 * @typedef {Object} Room
 * @property {string} _id
 * @property {Pool} pool
 * @property {number} win_rate
 * @property {number} capacity - Number of players room can contain.
 * @property {Player[]} players
 * @property {number} min_deposit - The minimal deposit to join the room.
 */

