const jwt = require('jsonwebtoken');

function normalizeToken(rawToken = '') {
  let token = String(rawToken || '').trim();

  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  for (let i = 0; i < 3; i += 1) {
    const unquoted = token.replace(/^"|"$/g, '').trim();
    if (unquoted === token) {
      break;
    }
    token = unquoted;
  }

  try {
    const parsed = JSON.parse(token);
    if (typeof parsed === 'string') {
      token = parsed.trim();
    }
  } catch {
    // Ignore parse errors and keep token as-is.
  }

  return token;
}

function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization || '';
    const [scheme, rawToken] = authorization.split(' ');

    if (scheme !== 'Bearer' || !rawToken) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = normalizeToken(rawToken);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = String(payload.userId ?? payload.id ?? '').trim();

    if (!userId) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    req.auth = {
      ...payload,
      userId,
    };

    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = {
  requireAuth,
};
