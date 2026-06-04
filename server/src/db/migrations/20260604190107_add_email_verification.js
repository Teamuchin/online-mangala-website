/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('users', {
    is_verified: { type: 'boolean', notNull: true, default: false },
    verification_token: { type: 'varchar(255)' },
    pending_email: { type: 'varchar(255)' }
  });

  // Verify all existing users so they don't get locked out
  pgm.sql(`UPDATE users SET is_verified = TRUE;`);
};

exports.down = (pgm) => {
  pgm.dropColumns('users', ['is_verified', 'verification_token', 'pending_email']);
};
