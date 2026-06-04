const express = require('express');
const { requireAuth } = require('../auth/middleware');
const db = require('../db');

const router = express.Router();

router.get('/:friendId', requireAuth, async (req, res) => {
  const { friendId } = req.params;
  const { userId } = req.auth;

  try {
    // Optional: check friendship status here or just fetch messages
    // Since only friends should have messages anyway, we can just fetch.
    const result = await db.query(`
      SELECT id, sender_id, receiver_id, content, read, created_at
      FROM direct_messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
      LIMIT 100
    `, [userId, friendId]);

    // Mark messages sent by friend to user as read
    const unreadIds = result.rows
      .filter(m => m.receiver_id == userId && !m.read)
      .map(m => m.id);
      
    if (unreadIds.length > 0) {
      await db.query(`
        UPDATE direct_messages 
        SET read = true 
        WHERE id = ANY($1)
      `, [unreadIds]);
      
      // Update the objects locally before sending to client
      result.rows.forEach(m => {
        if (unreadIds.includes(m.id)) {
          m.read = true;
        }
      });
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Failed to fetch messages:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
