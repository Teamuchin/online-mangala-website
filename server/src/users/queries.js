const PUBLIC_USER_SELECT_FIELDS = `
  id,
  username,
  elo,
  is_bot,
  created_at,
  last_seen
`;

const findPublicUserByUsernameQuery = `
SELECT ${PUBLIC_USER_SELECT_FIELDS}
FROM users
WHERE LOWER(username) = LOWER($1)
LIMIT 1;
`;

const listPublicUsersByEloQuery = `
SELECT ${PUBLIC_USER_SELECT_FIELDS}
FROM users
WHERE LOWER(username) NOT LIKE 'guest-%'
ORDER BY elo DESC, LOWER(username) ASC;
`;

module.exports = {
  findPublicUserByUsernameQuery,
  listPublicUsersByEloQuery,
};
