const db = require('../db');
const {
  findPublicUserByUsernameQuery,
  listPublicUsersByEloQuery,
} = require('./queries');

async function getUserByUsername(req, res) {
  try {
    const username = String(req.params?.username || '').trim();

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const result = await db.query(findPublicUserByUsernameQuery, [username]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Get user by username error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function listUsersByElo(req, res) {
  try {
    const result = await db.query(listPublicUsersByEloQuery);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('List users by elo error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  getUserByUsername,
  listUsersByElo,
};
