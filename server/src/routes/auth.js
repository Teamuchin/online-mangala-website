const express = require('express');
const { getMe, login, register, updateMe, guestLogin, verifyEmail, resendVerification, forgotPassword, resetPassword } = require('../auth/controller');
const { requireAuth } = require('../auth/middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/guest', guestLogin);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);

module.exports = router;
