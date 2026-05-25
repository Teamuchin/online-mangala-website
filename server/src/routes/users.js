const express = require('express');
const { getUserByUsername, listUsersByElo } = require('../users/controller');

const router = express.Router();

router.get('/', listUsersByElo);
router.get('/username/:username', getUserByUsername);

module.exports = router;
