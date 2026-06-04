/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS direct_messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS direct_messages_participants_idx
    ON direct_messages (
      LEAST(sender_id, receiver_id),
      GREATEST(sender_id, receiver_id)
    );
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS direct_messages_created_at_idx
    ON direct_messages (created_at DESC);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS direct_messages_created_at_idx;
  `);

  pgm.sql(`
    DROP INDEX IF EXISTS direct_messages_participants_idx;
  `);

  pgm.sql(`
    DROP TABLE IF EXISTS direct_messages;
  `);
};
