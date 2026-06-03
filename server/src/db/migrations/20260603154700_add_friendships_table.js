/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS friendships (
      id SERIAL PRIMARY KEY,
      requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT friendships_status_check CHECK (status IN ('pending', 'accepted')),
      CONSTRAINT friendships_different_users_check CHECK (requester_id <> addressee_id)
    );
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS friendships_unique_users_idx
    ON friendships (
      LEAST(requester_id, addressee_id),
      GREATEST(requester_id, addressee_id)
    );
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS friendships_unique_users_idx;
  `);

  pgm.sql(`
    DROP TABLE IF EXISTS friendships;
  `);
};
