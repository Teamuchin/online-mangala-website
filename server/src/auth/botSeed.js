const bcrypt = require('bcrypt');
const {
  findUserByUsernameQuery,
  createBotUserQuery,
  updateSeededBotUserQuery,
} = require('./queries');

const BOT_PASSWORD = 'mangala-bot-account';
const BOT_PASSWORD_SALT_ROUNDS = 10;

const SEEDED_BOTS = [
  { username: 'deniz-bot', email: 'deniz-bot@bots.mangala.local', elo: 1000 },
  { username: 'toprak-bot', email: 'toprak-bot@bots.mangala.local', elo: 1200 },
  { username: 'ruzgar-bot', email: 'ruzgar-bot@bots.mangala.local', elo: 1400 },
  { username: 'alev-bot', email: 'alev-bot@bots.mangala.local', elo: 1600 },
];

async function ensureSeededBotUsers(db) {
  const passwordHash = await bcrypt.hash(BOT_PASSWORD, BOT_PASSWORD_SALT_ROUNDS);

  for (const bot of SEEDED_BOTS) {
    const existingBotResult = await db.query(findUserByUsernameQuery, [bot.username]);

    if (existingBotResult.rows.length === 0) {
      await db.query(createBotUserQuery, [
        bot.username,
        bot.email,
        passwordHash,
        bot.elo,
      ]);
      continue;
    }

    await db.query(updateSeededBotUserQuery, [
      existingBotResult.rows[0].id,
      bot.username,
      bot.email,
      passwordHash,
      bot.elo,
    ]);
  }
}

module.exports = {
  SEEDED_BOTS,
  ensureSeededBotUsers,
};
