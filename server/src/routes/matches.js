const express = require('express');
const {
  submitMove,
  resignMatch,
  getMatchById,
  getMatchesByUserId,
  getActiveMatches,
} = require('../matches/controller');
const { requireAuth } = require('../auth/middleware');

const router = express.Router();

router.get('/active', getActiveMatches);
router.get('/user/:userId', getMatchesByUserId);
router.get('/:id', getMatchById);
router.post('/:id/moves', requireAuth, submitMove);
router.post('/:id/resign', requireAuth, resignMatch);

module.exports = router;
