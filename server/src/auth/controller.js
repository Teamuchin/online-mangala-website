const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const {
  findUserByCredentialQuery,
  findUserByEmailQuery,
  findUserByUsernameQuery,
  findUserByIdQuery,
  createUserQuery,
  updateUserPasswordQuery,
} = require('./queries');

const SALT_ROUNDS = 10;
const USERNAME_REGEX = /^[A-Za-z0-9_-]{3,15}$/;
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 32;

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

function sanitizeProfileUser(userRow) {
  return {
    id: userRow.id,
    username: userRow.username,
    email: userRow.email,
    elo: userRow.elo,
    is_bot: userRow.is_bot,
    created_at: userRow.created_at,
  };
}

function isBotUser(userRow) {
  return userRow?.is_bot === true;
}

async function register(req, res) {
  try {
    const username = String(req.body?.username || '').trim();
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email and password are required' });
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({
        message: 'Username must be 3-15 characters and use only letters, numbers, underscores, or hyphens',
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      return res.status(400).json({
        message: `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters long`,
      });
    }

    const existingUserResult = await db.query(findUserByEmailQuery, [email]);

    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const existingUsernameResult = await db.query(findUserByUsernameQuery, [username]);

    if (existingUsernameResult.rows.length > 0) {
      return res.status(409).json({ message: 'Username is already taken' });
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

    if (isBotUser(userRow)) {
      return res.status(403).json({ message: 'Bot accounts cannot sign in' });
    }

    const isMatch = await bcrypt.compare(password, userRow.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = sanitizeProfileUser(userRow);
    const token = signAuthToken(user);

    return res.status(200).json({ message: 'Login successful', token, user });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateMe(req, res) {
  try {
    const userId = String(req.auth?.userId || '').trim();
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const existingUserResult = await db.query(findUserByIdQuery, [userId]);

    if (existingUserResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (isBotUser(existingUserResult.rows[0])) {
      return res.status(403).json({ message: 'Bot accounts cannot manage account settings' });
    }

    if (!currentPassword) {
      return res.status(400).json({ message: 'Enter your password first' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      existingUserResult.rows[0].password_hash,
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: 'Password is incorrect' });
    }

    const wantsPasswordChange = newPassword || confirmPassword;

    if (!wantsPasswordChange) {
      const user = sanitizeProfileUser(existingUserResult.rows[0]);
      const token = signAuthToken(user);

      return res.status(200).json({
        message: 'No account details changed',
        user,
        token,
      });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Fill new password and confirm password to change password' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirmation do not match' });
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH) {
      return res.status(400).json({
        message: `New password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters long`,
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.query(updateUserPasswordQuery, [userId, newPasswordHash]);

    const refreshedUserResult = await db.query(findUserByIdQuery, [userId]);
    const user = sanitizeProfileUser(refreshedUserResult.rows[0]);
    const token = signAuthToken(user);

    return res.status(200).json({
      message: 'Password updated successfully',
      user,
      token,
    });
  } catch (error) {
    console.error('Update account error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getMe(req, res) {
  try {
    const userId = String(req.auth?.userId || '').trim();

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userResult = await db.query(findUserByIdQuery, [userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (isBotUser(userResult.rows[0])) {
      return res.status(403).json({ message: 'Bot accounts cannot sign in' });
    }

    return res.status(200).json({ user: sanitizeProfileUser(userResult.rows[0]) });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateMe,
};
