const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');
const {
  findUserByCredentialQuery,
  findUserByEmailQuery,
  findUserByUsernameQuery,
  findUserByIdQuery,
  createUserQuery,
  updateUserPasswordQuery,
  updateUserUsernameQuery,
  findUserByVerificationTokenQuery,
  verifyUserEmailQuery,
  updateUserPendingEmailQuery,
  updateVerificationTokenQuery,
  setResetPasswordTokenQuery,
  findUserByValidResetTokenQuery,
  updatePasswordAndClearTokenQuery,
} = require('./queries');
const { sendVerificationEmail, isValidEmailWithMX, sendPasswordResetEmail } = require('../utils/email');

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

function sanitizeProfileUser(userRow) {
  return {
    id: userRow.id,
    username: userRow.username,
    email: userRow.email,
    elo: userRow.elo,
    is_bot: userRow.is_bot,
    created_at: userRow.created_at,
    is_verified: userRow.is_verified,
    pending_email: userRow.pending_email,
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

    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      return res.status(400).json({
        message: `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters long`,
      });
    }

    const isValidMX = await isValidEmailWithMX(email);
    if (!isValidMX) {
      return res.status(400).json({ message: 'Invalid email address or domain cannot receive emails' });
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
    const verificationToken = crypto.randomBytes(32).toString('hex');
    // For normal registration, they are not verified initially
    const createUserResult = await db.query(createUserQuery, [username, email, passwordHash, verificationToken, false]);

    const userRow = createUserResult.rows[0];
    
    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // We still registered them, so proceed. They can resend later.
    }

    const user = sanitizeProfileUser(userRow);
    const token = signAuthToken(user);

    return res.status(201).json({ message: 'User registered successfully. Please check your email to verify your account.', token, user });
  } catch (error) {
    console.error('Register error:', error);

    if (error.code === '23505') {
      const constraintName = String(error.constraint || '');

      if (
        constraintName === 'users_email_key' ||
        /email/i.test(String(error.detail || ''))
      ) {
        return res.status(409).json({ message: 'Email is already registered' });
      }

      if (
        constraintName === 'users_username_lower_unique_idx' ||
        /username/i.test(String(error.detail || ''))
      ) {
        return res.status(409).json({ message: 'Username is already taken' });
      }

      return res.status(409).json({ message: 'User already exists' });
    }

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

    // Check if verification required (1 day grace period)
    if (!userRow.is_verified) {
      const oneDay = 24 * 60 * 60 * 1000;
      const createdAt = new Date(userRow.created_at).getTime();
      const now = Date.now();
      if (now - createdAt > oneDay) {
        return res.status(403).json({ message: 'Please verify your email to log in.' });
      }
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
    const userId = String(req.auth?.userId || "").trim();
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");
    const confirmPassword = String(req.body?.confirmPassword || "");

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const existingUserResult = await db.query(findUserByIdQuery, [userId]);

    if (existingUserResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingUser = existingUserResult.rows[0];

    if (isBotUser(existingUser)) {
      return res.status(403).json({ message: "Bot accounts cannot manage account settings" });
    }

    if (!currentPassword) {
      return res.status(400).json({ message: "Enter your password first" });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      existingUser.password_hash,
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Password is incorrect" });
    }

    const hasUsernameField = Object.prototype.hasOwnProperty.call(req.body || {}, "username");
    const requestedUsername = hasUsernameField
      ? String(req.body.username || "").trim()
      : existingUser.username;
    const wantsUsernameChange = requestedUsername !== existingUser.username;

    const hasEmailField = Object.prototype.hasOwnProperty.call(req.body || {}, "email");
    const requestedEmail = hasEmailField
      ? normalizeEmail(req.body.email)
      : existingUser.email;
    const wantsEmailChange = requestedEmail !== existingUser.email;

    const wantsPasswordChange = Boolean(newPassword || confirmPassword);

    if (hasUsernameField && !USERNAME_REGEX.test(requestedUsername)) {
      return res.status(400).json({
        message: "Username must be 3-15 characters and use only letters, numbers, underscores, or hyphens",
      });
    }

    if (wantsUsernameChange && requestedUsername.toLowerCase() !== existingUser.username.toLowerCase()) {
      const existingUsernameResult = await db.query(findUserByUsernameQuery, [requestedUsername]);
      const usernameOwner = existingUsernameResult.rows[0];

      if (usernameOwner && String(usernameOwner.id) !== userId) {
        return res.status(409).json({ message: "Username is already taken" });
      }
    }

    if (wantsEmailChange) {
      const isValidMX = await isValidEmailWithMX(requestedEmail);
      if (!isValidMX) {
        return res.status(400).json({ message: 'Invalid email address or domain cannot receive emails' });
      }

      const existingEmailResult = await db.query(findUserByEmailQuery, [requestedEmail]);
      const emailOwner = existingEmailResult.rows[0];

      if (emailOwner && String(emailOwner.id) !== userId) {
        return res.status(409).json({ message: "Email is already taken" });
      }
    }

    if (wantsPasswordChange) {
      if (!newPassword || !confirmPassword) {
        return res.status(400).json({ message: "Fill new password and confirm password to change password" });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: "New password and confirmation do not match" });
      }

      if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH) {
        return res.status(400).json({
          message: "New password must be " + PASSWORD_MIN_LENGTH + "-" + PASSWORD_MAX_LENGTH + " characters long",
        });
      }
    }

    if (!wantsUsernameChange && !wantsPasswordChange && !wantsEmailChange) {
      const user = sanitizeProfileUser(existingUser);
      const token = signAuthToken(user);

      return res.status(200).json({
        message: "No account details changed",
        user,
        token,
      });
    }

    const newPasswordHash = wantsPasswordChange
      ? await bcrypt.hash(newPassword, SALT_ROUNDS)
      : null;
    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      if (wantsUsernameChange) {
        await client.query(updateUserUsernameQuery, [userId, requestedUsername]);
      }

      if (wantsPasswordChange) {
        await client.query(updateUserPasswordQuery, [userId, newPasswordHash]);
      }

      let emailMessage = '';
      if (wantsEmailChange) {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        await client.query(updateUserPendingEmailQuery, [userId, requestedEmail, verificationToken]);
        try {
          await sendVerificationEmail(requestedEmail, verificationToken);
          emailMessage = ' Please check your new email to verify it.';
        } catch (emailError) {
          console.error('Failed to send verification email for email change:', emailError);
        }
      }

      const refreshedUserResult = await client.query(findUserByIdQuery, [userId]);
      await client.query("COMMIT");

      const user = sanitizeProfileUser(refreshedUserResult.rows[0]);
      const token = signAuthToken(user);
      
      let message = "Account updated successfully.";
      if (wantsEmailChange && !wantsUsernameChange && !wantsPasswordChange) {
        message = "Email change requested.";
      }
      message += emailMessage;

      return res.status(200).json({
        message,
        user,
        token,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Update account error:", error);

    if (error.code === "23505") {
      const constraintName = String(error.constraint || "");

      if (
        constraintName === "users_username_lower_unique_idx" ||
        /username/i.test(String(error.detail || ""))
      ) {
        return res.status(409).json({ message: "Username is already taken" });
      }

      return res.status(409).json({ message: "User or Email already exists" });
    }

    return res.status(500).json({ message: "Internal server error" });
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

async function guestLogin(req, res) {
  try {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toLowerCase();
    const username = `Guest-${randomSuffix}`;
    const email = `guest-${randomSuffix}@example.com`;
    const randomPassword = Math.random().toString(36).slice(-10);

    const passwordHash = await bcrypt.hash(randomPassword, SALT_ROUNDS);
    // Guest accounts are automatically verified and need no token
    const createUserResult = await db.query(createUserQuery, [username, email, passwordHash, null, true]);

    const userRow = createUserResult.rows[0];
    const user = sanitizeProfileUser(userRow);
    const token = signAuthToken(user);

    return res.status(201).json({ message: 'Guest login successful', token, user });
  } catch (error) {
    console.error('Guest login error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function verifyEmail(req, res) {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    const userResult = await db.query(findUserByVerificationTokenQuery, [token]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    const userRow = userResult.rows[0];
    const verifyResult = await db.query(verifyUserEmailQuery, [userRow.id]);
    
    return res.status(200).json({ 
      message: 'Email verified successfully',
      user: sanitizeProfileUser(verifyResult.rows[0])
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function resendVerification(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const userResult = await db.query(findUserByEmailQuery, [email]);
    if (userResult.rows.length === 0) {
      // Do not reveal if email exists or not
      return res.status(200).json({ message: 'If your email is registered, a verification link has been sent.' });
    }

    const userRow = userResult.rows[0];
    if (userRow.is_verified && !userRow.pending_email) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await db.query(updateVerificationTokenQuery, [userRow.id, verificationToken]);

    const targetEmail = userRow.pending_email || userRow.email;
    try {
      await sendVerificationEmail(targetEmail, verificationToken);
    } catch (emailError) {
      console.error('Failed to resend verification email:', emailError);
    }

    return res.status(200).json({ message: 'If your email is registered, a verification link has been sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function forgotPassword(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const userResult = await db.query(findUserByEmailQuery, [email]);
    if (userResult.rows.length === 0) {
      // Security best practice: don't reveal if the email exists or not
      return res.status(200).json({ message: 'If your email is registered, a password reset link has been sent.' });
    }

    const userRow = userResult.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Set expiration to 1 hour from now
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await db.query(setResetPasswordTokenQuery, [userRow.id, resetToken, expiresAt]);

    try {
      await sendPasswordResetEmail(userRow.email, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    return res.status(200).json({ message: 'If your email is registered, a password reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function resetPassword(req, res) {
  try {
    const token = String(req.body?.token || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < PASSWORD_MIN_LENGTH || newPassword.length > PASSWORD_MAX_LENGTH) {
      return res.status(400).json({
        message: `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters long`,
      });
    }

    const userResult = await db.query(findUserByValidResetTokenQuery, [token]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    const userRow = userResult.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db.query(updatePasswordAndClearTokenQuery, [userRow.id, passwordHash]);

    return res.status(200).json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  guestLogin,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};
