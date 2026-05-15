const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const {
  findUserByCredentialQuery,
  findUserByEmailQuery,
  findUserByIdQuery,
  findUserByEmailExcludingIdQuery,
  createUserQuery,
  updateUserProfileQuery,
  updateUserPasswordQuery,
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

function sanitizeProfileUser(userRow) {
  return {
    id: userRow.id,
    username: userRow.username,
    email: userRow.email,
    bio: userRow.bio || '',
    created_at: userRow.created_at,
  };
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
    const username = String(req.body?.username || '').trim();
    const email = normalizeEmail(req.body?.email);
    const bio = String(req.body?.bio || '').trim();
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!username || !email) {
      return res.status(400).json({ message: 'username and email are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Invalid email address' });
    }

    const existingUserResult = await db.query(findUserByIdQuery, [userId]);

    if (existingUserResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
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

    const duplicateEmailResult = await db.query(findUserByEmailExcludingIdQuery, [email, userId]);

    if (duplicateEmailResult.rows.length > 0) {
      return res.status(409).json({ message: 'Email is already in use by another account' });
    }

    const wantsPasswordChange = newPassword || confirmPassword;

    if (wantsPasswordChange) {
      if (!newPassword || !confirmPassword) {
        return res.status(400).json({ message: 'Fill new password and confirm password to change password' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'New password and confirmation do not match' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'New password must be at least 6 characters long' });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await db.query(updateUserPasswordQuery, [userId, newPasswordHash]);
    }

    const updatedUserResult = await db.query(updateUserProfileQuery, [
      userId,
      username,
      email,
      bio,
    ]);

    const user = sanitizeProfileUser(updatedUserResult.rows[0]);
    const token = signAuthToken(user);

    return res.status(200).json({
      message: 'Account updated successfully',
      user,
      token,
    });
  } catch (error) {
    console.error('Update account error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  register,
  login,
  updateMe,
};
