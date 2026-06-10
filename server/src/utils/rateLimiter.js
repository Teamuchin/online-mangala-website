const rateLimit = require('express-rate-limit');

/**
 * Creates a rate limiter middleware using express-rate-limit.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
 *   router.post('/forgot-password', limiter, forgotPassword);
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 5, message = 'Too many requests, please try again later.' } = {}) {
  return rateLimit({
    windowMs,
    max,
    message: { message },
    standardHeaders: true,
    legacyHeaders: false,
  });
}

module.exports = { createRateLimiter };
