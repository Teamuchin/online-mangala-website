const express = require('express');
const { getMe, login, register, updateMe, guestLogin, verifyEmail, resendVerification, forgotPassword, resetPassword, googleAuth, completeProfile } = require('../auth/controller');
const { requireAuth } = require('../auth/middleware');
const { createRateLimiter } = require('../utils/rateLimiter');

const router = express.Router();

// Rate limiters for password recovery endpoints
const forgotPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 requests per window per IP
  message: 'Too many password reset requests, please try again later.',
});

const resetPasswordLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // 10 requests per window per IP
  message: 'Too many password reset attempts, please try again later.',
});

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/complete-profile', requireAuth, completeProfile);
router.post('/guest', guestLogin);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);
router.get('/me', requireAuth, getMe);
router.patch('/me', requireAuth, updateMe);

module.exports = router;

