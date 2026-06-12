/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL;
  `);

  pgm.sql(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
  `);

  pgm.sql(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local';
  `);

  pgm.sql(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS needs_username_setup BOOLEAN DEFAULT FALSE;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS needs_username_setup;
  `);

  pgm.sql(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS auth_provider;
  `);

  pgm.sql(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS google_id;
  `);

  pgm.sql(`
    -- We can't easily revert password_hash to NOT NULL without handling 
    -- users who don't have passwords. But we can attempt it.
    -- Ideally, we'd delete those users or give them a dummy password first.
    -- For safety in rollbacks of a dev DB, we'll just leave it as is or add dummy.
    -- ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
  `);
};
