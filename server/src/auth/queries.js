const createUsersTableQuery = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const ensureBioColumnQuery = `
ALTER TABLE users
ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
`;

const findUserByCredentialQuery = `
SELECT id, username, email, password_hash, bio, created_at
FROM users
WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
LIMIT 1;
`;

const findUserByEmailQuery = `
SELECT id, username, email, password_hash, bio, created_at
FROM users
WHERE email = $1
LIMIT 1;
`;

const findUserByIdQuery = `
SELECT id, username, email, password_hash, bio, created_at
FROM users
WHERE id = $1
LIMIT 1;
`;

const findUserByEmailExcludingIdQuery = `
SELECT id
FROM users
WHERE LOWER(email) = LOWER($1) AND id <> $2
LIMIT 1;
`;

const createUserQuery = `
INSERT INTO users (username, email, password_hash, bio)
VALUES ($1, $2, $3, '')
RETURNING id, username, email, bio, created_at;
`;

const updateUserProfileQuery = `
UPDATE users
SET username = $2,
    email = $3,
    bio = $4
WHERE id = $1
RETURNING id, username, email, bio, created_at;
`;

const updateUserPasswordQuery = `
UPDATE users
SET password_hash = $2
WHERE id = $1;
`;

module.exports = {
  createUsersTableQuery,
  ensureBioColumnQuery,
  findUserByCredentialQuery,
  findUserByEmailQuery,
  findUserByIdQuery,
  findUserByEmailExcludingIdQuery,
  createUserQuery,
  updateUserProfileQuery,
  updateUserPasswordQuery,
};
