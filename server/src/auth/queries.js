const createUsersTableQuery = `
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    profile_picture TEXT,
    bio TEXT,
    elo_rating FLOAT DEFAULT 1000.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const findUserByCredentialQuery = `
SELECT id, username, email, password_hash, created_at
FROM users
WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
LIMIT 1;
`;

const findUserByEmailQuery = `
SELECT id, username, email, password_hash, created_at
FROM users
WHERE email = $1
LIMIT 1;
`;

const createUserQuery = `
INSERT INTO users (username, email, password_hash)
VALUES ($1, $2, $3)
RETURNING id, username, email, created_at;
`;

module.exports = {
  createUsersTableQuery,
  findUserByCredentialQuery,
  findUserByEmailQuery,
  createUserQuery,
};
