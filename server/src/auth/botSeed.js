const bcrypt = require('bcrypt');
const {
  findUserByUsernameQuery,
  createBotUserQuery,
  updateSeededBotUserQuery,
} = require('./queries');

const BOT_PASSWORD = 'mangala-bot-account';
const BOT_PASSWORD_SALT_ROUNDS = 10;
const UPDATE_MATCH_BOTTOM_PLAYER_QUERY = `
UPDATE matches
SET bottom_player_id = $1
WHERE bottom_player_id = $2;
`;
const UPDATE_MATCH_TOP_PLAYER_QUERY = `
UPDATE matches
SET top_player_id = $1
WHERE top_player_id = $2;
`;
const DELETE_USER_BY_ID_QUERY = `
DELETE FROM users
WHERE id = $1;
`;

const SEEDED_BOTS = [
  {
    username: 'deniz01',
    email: 'deniz01@bots.mangala.local',
    elo: 1000,
    legacyUsernames: ['deniz-bot', 'deniz2416'],
  },
  {
    username: 'toprak02',
    email: 'toprak02@bots.mangala.local',
    elo: 1200,
    legacyUsernames: ['toprak-bot', 'toprak5824'],
  },
  {
    username: 'ruzgar03',
    email: 'ruzgar03@bots.mangala.local',
    elo: 1400,
    legacyUsernames: ['ruzgar-bot', 'ruzgar4683'],
  },
  {
    username: 'alev04',
    email: 'alev04@bots.mangala.local',
    elo: 1600,
    legacyUsernames: ['alev-bot', 'alev3467'],
  },
];

async function readSeededBotCandidates(db, bot) {
  const usernames = [bot.username, ...(bot.legacyUsernames ?? [])];
  const seenUserIds = new Set();
  const matches = [];

  for (const username of usernames) {
    const result = await db.query(findUserByUsernameQuery, [username]);

    for (const row of result.rows) {
      if (seenUserIds.has(row.id)) {
        continue;
      }

      seenUserIds.add(row.id);
      matches.push(row);
    }
  }

  return matches;
}

function getCanonicalSeededBotUser(candidates) {
  return [...candidates].sort((left, right) => {
    const leftCreatedAt = Date.parse(left.created_at ?? 0);
    const rightCreatedAt = Date.parse(right.created_at ?? 0);

    if (leftCreatedAt !== rightCreatedAt) {
      return leftCreatedAt - rightCreatedAt;
    }

    return Number(left.id) - Number(right.id);
  })[0] ?? null;
}

async function mergeSeededBotUsers(db, canonicalUserId, duplicateUserIds) {
  if (!duplicateUserIds.length) {
    return;
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    for (const duplicateUserId of duplicateUserIds) {
      await client.query(UPDATE_MATCH_BOTTOM_PLAYER_QUERY, [
        canonicalUserId,
        duplicateUserId,
      ]);
      await client.query(UPDATE_MATCH_TOP_PLAYER_QUERY, [
        canonicalUserId,
        duplicateUserId,
      ]);
      await client.query(DELETE_USER_BY_ID_QUERY, [duplicateUserId]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function ensureSeededBotUsers(db) {
  const passwordHash = await bcrypt.hash(BOT_PASSWORD, BOT_PASSWORD_SALT_ROUNDS);

  for (const bot of SEEDED_BOTS) {
    const candidates = await readSeededBotCandidates(db, bot);

    if (candidates.length === 0) {
      await db.query(createBotUserQuery, [
        bot.username,
        bot.email,
        passwordHash,
        bot.elo,
      ]);
      continue;
    }

    const canonicalUser = getCanonicalSeededBotUser(candidates);
    const duplicateUserIds = candidates
      .filter((candidate) => candidate.id !== canonicalUser.id)
      .map((candidate) => candidate.id);

    await mergeSeededBotUsers(db, canonicalUser.id, duplicateUserIds);

    await db.query(updateSeededBotUserQuery, [
      canonicalUser.id,
      bot.username,
      bot.email,
      passwordHash,
    ]);
  }
}

module.exports = {
  SEEDED_BOTS,
  ensureSeededBotUsers,
};
