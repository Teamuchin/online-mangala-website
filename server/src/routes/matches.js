const express = require('express');
const {
  createMatch,
  updateMatch,
  getMatchById,
  getMatchesByUserId,
} = require('../matches/controller');
const { requireAuth } = require('../auth/middleware');

const router = express.Router();

router.get('/user/:userId', getMatchesByUserId);
router.get('/:id', getMatchById);
router.post('/', requireAuth, createMatch);
router.patch('/:id', requireAuth, updateMatch);

module.exports = router;
