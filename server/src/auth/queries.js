const createUsersTableQuery = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(15) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  elo INTEGER NOT NULL DEFAULT 1200,
  is_bot BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const dropBioColumnQuery = `
ALTER TABLE users
DROP COLUMN IF EXISTS bio;
`;

const ensureEloColumnQuery = `
ALTER TABLE users
ADD COLUMN IF NOT EXISTS elo INTEGER NOT NULL DEFAULT 1200;
`;

const ensureIsBotColumnQuery = `
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE;
`;

const ensureUsernameTypeQuery = `
ALTER TABLE users
ALTER COLUMN username TYPE VARCHAR(15);
`;

const ensureUsernameUniqueIndexQuery = `
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique_idx
ON users (LOWER(username));
`;

const findUserByCredentialQuery = `
SELECT id, username, email, password_hash, elo, is_bot, created_at, is_verified, pending_email
FROM users
WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
LIMIT 1;
`;

const findUserByEmailQuery = `
SELECT id, username, email, password_hash, elo, is_bot, created_at, is_verified, pending_email
FROM users
WHERE LOWER(email) = LOWER($1)
LIMIT 1;
`;

const findUserByUsernameQuery = `
SELECT id, username, email, password_hash, elo, is_bot, created_at, is_verified, pending_email
FROM users
WHERE LOWER(username) = LOWER($1)
LIMIT 1;
`;

const findUserByIdQuery = `
SELECT id, username, email, password_hash, elo, is_bot, created_at, is_verified, pending_email
FROM users
WHERE id = $1
LIMIT 1;
`;

const createUserQuery = `
INSERT INTO users (username, email, password_hash, elo, is_bot, verification_token, is_verified)
VALUES ($1, $2, $3, 1200, FALSE, $4, $5)
RETURNING id, username, email, elo, is_bot, created_at, is_verified, pending_email;
`;

const createBotUserQuery = `
INSERT INTO users (username, email, password_hash, elo, is_bot, is_verified)
VALUES ($1, $2, $3, $4, TRUE, TRUE)
RETURNING id, username, email, elo, is_bot, created_at, is_verified;
`;

const updateUserPasswordQuery = `
UPDATE users
SET password_hash = $2
WHERE id = $1;
`;

const updateUserUsernameQuery = `
UPDATE users
SET username = $2
WHERE id = $1
RETURNING id, username, email, elo, is_bot, created_at;
`;

const updateSeededBotUserQuery = `
UPDATE users
SET username = $2,
    email = $3,
    password_hash = $4,
    is_bot = TRUE,
    is_verified = TRUE
WHERE id = $1
RETURNING id, username, email, elo, is_bot, created_at, is_verified;
`;

const updateUserEloQuery = `
UPDATE users
SET elo = $2
WHERE id = $1
RETURNING id, username, email, elo, is_bot, created_at, is_verified, pending_email;
`;

const findUserByVerificationTokenQuery = `
SELECT id, username, email, password_hash, elo, is_bot, created_at, is_verified, pending_email
FROM users
WHERE verification_token = $1
LIMIT 1;
`;

const verifyUserEmailQuery = `
UPDATE users
SET is_verified = TRUE,
    verification_token = NULL,
    email = COALESCE(pending_email, email),
    pending_email = NULL
WHERE id = $1
RETURNING id, username, email, elo, is_bot, created_at, is_verified, pending_email;
`;

const updateUserPendingEmailQuery = `
UPDATE users
SET pending_email = $2,
    verification_token = $3
WHERE id = $1
RETURNING id, username, email, elo, is_bot, created_at, is_verified, pending_email;
`;

const updateVerificationTokenQuery = `
UPDATE users
SET verification_token = $2
WHERE id = $1
RETURNING id, username, email, elo, is_bot, created_at, is_verified, pending_email;
`;

const setResetPasswordTokenQuery = `
UPDATE users
SET reset_password_token = $2,
    reset_password_expires_at = $3
WHERE id = $1
RETURNING id, email;
`;

const findUserByValidResetTokenQuery = `
SELECT id, username, email, password_hash, elo, is_bot, created_at, is_verified, pending_email
FROM users
WHERE reset_password_token = $1 AND reset_password_expires_at > NOW()
LIMIT 1;
`;

const updatePasswordAndClearTokenQuery = `
UPDATE users
SET password_hash = $2,
    reset_password_token = NULL,
    reset_password_expires_at = NULL
WHERE id = $1
RETURNING id, username, email;
`;

module.exports = {
  createUsersTableQuery,
  dropBioColumnQuery,
  ensureEloColumnQuery,
  ensureIsBotColumnQuery,
  ensureUsernameTypeQuery,
  ensureUsernameUniqueIndexQuery,
  findUserByCredentialQuery,
  findUserByEmailQuery,
  findUserByUsernameQuery,
  findUserByIdQuery,
  createUserQuery,
  createBotUserQuery,
  updateUserPasswordQuery,
  updateUserUsernameQuery,
  updateSeededBotUserQuery,
  updateUserEloQuery,
  findUserByVerificationTokenQuery,
  verifyUserEmailQuery,
  updateUserPendingEmailQuery,
  updateVerificationTokenQuery,
  setResetPasswordTokenQuery,
  findUserByValidResetTokenQuery,
  updatePasswordAndClearTokenQuery,
};
