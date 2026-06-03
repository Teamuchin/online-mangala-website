const db = require('../db');
const { findPublicUserByUsernameQuery } = require('../users/queries');
const {
  getFriendshipQuery,
  insertFriendshipQuery,
  updateFriendshipStatusQuery,
  deleteFriendshipQuery,
  listUserFriendshipsQuery,
} = require('./queries');

async function listFriends(req, res) {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const result = await db.query(listUserFriendshipsQuery, [userId]);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('List friends error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function sendRequest(req, res) {
  try {
    const userId = req.auth?.userId;
    const { username } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!username) return res.status(400).json({ message: 'Username is required' });

    // Find addressee by username
    const userResult = await db.query(findPublicUserByUsernameQuery, [username]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const addresseeId = userResult.rows[0].id;

    if (String(userId) === String(addresseeId)) {
      return res.status(400).json({ message: 'Cannot send a friend request to yourself' });
    }

    // Check if friendship already exists
    const existing = await db.query(getFriendshipQuery, [userId, addresseeId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Friendship or pending request already exists' });
    }

    const newFriendship = await db.query(insertFriendshipQuery, [userId, addresseeId]);
    return res.status(201).json(newFriendship.rows[0]);
  } catch (error) {
    console.error('Send friend request error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function acceptRequest(req, res) {
  try {
    const userId = req.auth?.userId;
    const { username } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!username) return res.status(400).json({ message: 'Username is required' });

    const userResult = await db.query(findPublicUserByUsernameQuery, [username]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const requesterId = userResult.rows[0].id;

    const existing = await db.query(getFriendshipQuery, [userId, requesterId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    const friendship = existing.rows[0];
    if (friendship.status === 'accepted') {
      return res.status(400).json({ message: 'Already friends' });
    }
    if (String(friendship.addressee_id) !== String(userId)) {
      return res.status(403).json({ message: 'You are not the addressee of this request' });
    }

    const updated = await db.query(updateFriendshipStatusQuery, [userId, requesterId, 'accepted']);
    return res.status(200).json(updated.rows[0]);
  } catch (error) {
    console.error('Accept friend request error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function rejectRequest(req, res) {
  try {
    const userId = req.auth?.userId;
    const { username } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!username) return res.status(400).json({ message: 'Username is required' });

    const userResult = await db.query(findPublicUserByUsernameQuery, [username]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const requesterId = userResult.rows[0].id;

    const existing = await db.query(getFriendshipQuery, [userId, requesterId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    const friendship = existing.rows[0];
    if (String(friendship.addressee_id) !== String(userId)) {
      return res.status(403).json({ message: 'You are not the addressee of this request' });
    }

    await db.query(deleteFriendshipQuery, [userId, requesterId]);
    return res.status(200).json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend request error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function removeFriend(req, res) {
  try {
    const userId = req.auth?.userId;
    const { username } = req.body; // friend to remove

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (!username) return res.status(400).json({ message: 'Username is required' });

    const userResult = await db.query(findPublicUserByUsernameQuery, [username]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    const friendId = userResult.rows[0].id;

    await db.query(deleteFriendshipQuery, [userId, friendId]);
    return res.status(200).json({ message: 'Friend removed' });
  } catch (error) {
    console.error('Remove friend error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  listFriends,
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeFriend,
};
