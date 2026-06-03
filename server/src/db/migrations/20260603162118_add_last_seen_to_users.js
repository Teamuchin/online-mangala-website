exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS last_seen;
  `);
};
