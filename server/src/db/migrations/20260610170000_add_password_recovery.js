/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('users', {
    reset_password_token: { type: 'varchar(255)' },
    reset_password_expires_at: { type: 'timestamptz' }
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('users', ['reset_password_token', 'reset_password_expires_at']);
};
