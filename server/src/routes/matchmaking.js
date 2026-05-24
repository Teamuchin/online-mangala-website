const express = require('express');
const { requireAuth } = require('../auth/middleware');
const {
  getQueueStatus,
  joinQueue,
  leaveQueue,
} = require('../matchmaking/controller');

const router = express.Router();

router.get('/status', requireAuth, getQueueStatus);
router.post('/join', requireAuth, joinQueue);
router.delete('/leave', requireAuth, leaveQueue);

module.exports = router;
