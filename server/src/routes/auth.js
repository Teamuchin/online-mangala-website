const express = require('express');
const { login, register, updateMe } = require('../auth/controller');
const { requireAuth } = require('../auth/middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.patch('/me', requireAuth, updateMe);

module.exports = router;
