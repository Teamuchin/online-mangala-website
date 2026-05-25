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
SELECT id, username, email, password_hash, elo, is_bot, created_at
FROM users
WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
LIMIT 1;
`;

const findUserByEmailQuery = `
SELECT id, username, email, password_hash, elo, is_bot, created_at
FROM users
WHERE email = $1
LIMIT 1;
`;

const findUserByUsernameQuery = `
SELECT id, username, email, password_hash, elo, is_bot, created_at
FROM users
WHERE LOWER(username) = LOWER($1)
LIMIT 1;
`;

const findUserByIdQuery = `
SELECT id, username, email, password_hash, elo, is_bot, created_at
FROM users
WHERE id = $1
LIMIT 1;
`;

const createUserQuery = `
INSERT INTO users (username, email, password_hash, elo, is_bot)
VALUES ($1, $2, $3, 1200, FALSE)
RETURNING id, username, email, elo, is_bot, created_at;
`;

const updateUserPasswordQuery = `
UPDATE users
SET password_hash = $2
WHERE id = $1;
`;

const updateUserEloQuery = `
UPDATE users
SET elo = $2
WHERE id = $1
RETURNING id, username, email, elo, is_bot, created_at;
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
  updateUserPasswordQuery,
  updateUserEloQuery,
};
