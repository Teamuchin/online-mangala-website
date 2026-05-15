const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const {
  findUserByCredentialQuery,
  findUserByEmailQuery,
  createUserQuery,
} = require('./queries');

const SALT_ROUNDS = 10;

function signAuthToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

function normalizeEmail(email = '') {
  return String(email).trim().toLowerCase();
}

function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

async function register(req, res) {
  try {
    const username = String(req.body?.username || '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email and password are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingUserResult = await db.query(findUserByEmailQuery, [email]);

    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const createUserResult = await db.query(createUserQuery, [username, email, passwordHash]);

    const user = createUserResult.rows[0];
    const token = signAuthToken(user);

    return res.status(201).json({ message: 'User registered successfully', token, user });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function login(req, res) {
  try {
    const credential = String(req.body?.email || req.body?.credential || '').trim();
    const password = String(req.body?.password || '');

    if (!credential || !password) {
      return res.status(400).json({ message: 'email/username and password are required' });
    }

    const userResult = await db.query(findUserByCredentialQuery, [credential]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const userRow = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, userRow.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      created_at: userRow.created_at,
    };

    const token = signAuthToken(user);

    return res.status(200).json({ message: 'Login successful', token, user });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  register,
  login,
};
