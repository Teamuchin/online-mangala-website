const express = require('express');
const { requireAuth } = require('../auth/middleware');
const {
  listFriends,
  sendRequest,
  acceptRequest,
  rejectRequest,
  removeFriend,
} = require('../friends/controller');

const router = express.Router();

router.use(requireAuth);

router.get('/', listFriends);
router.post('/request', sendRequest);
router.post('/accept', acceptRequest);
router.post('/reject', rejectRequest);
router.post('/remove', removeFriend);

module.exports = router;
