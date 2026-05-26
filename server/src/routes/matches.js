const express = require('express');
const {
  createMatch,
  updateMatch,
  submitMove,
  getMatchById,
  getMatchesByUserId,
  getActiveMatches,
} = require('../matches/controller');
const { requireAuth } = require('../auth/middleware');

const router = express.Router();

router.get('/active', getActiveMatches);
router.get('/user/:userId', getMatchesByUserId);
router.get('/:id', getMatchById);
router.post('/', requireAuth, createMatch);
router.post('/:id/moves', requireAuth, submitMove);
router.patch('/:id', requireAuth, updateMatch);

module.exports = router;
