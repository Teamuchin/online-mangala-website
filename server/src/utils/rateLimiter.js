/**
 * Lightweight in-memory rate limiter for Express.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
 *   router.post('/forgot-password', limiter, forgotPassword);
 *
 * This is a simple per-IP store that auto-cleans expired entries.
 * For production at scale, consider a Redis-backed solution.
 */

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 5, message = 'Too many requests, please try again later.' } = {}) {
  const hits = new Map(); // key: IP, value: { count, resetTime }

  // Periodically purge expired entries to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now >= entry.resetTime) {
        hits.delete(key);
      }
    }
  }, windowMs);

  // Allow the timer to not keep the process alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimitMiddleware(req, res, next) {
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();

    let entry = hits.get(key);

    if (!entry || now >= entry.resetTime) {
      entry = { count: 0, resetTime: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    // Set standard rate-limit headers
    const remaining = Math.max(0, max - entry.count);
    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(remaining));
    res.set('RateLimit-Reset', String(Math.ceil(entry.resetTime / 1000)));

    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({ message });
    }

    next();
  };
}

module.exports = { createRateLimiter };
