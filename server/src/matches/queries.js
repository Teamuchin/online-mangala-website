const MATCH_SELECT_FIELDS = `
  matches.*,
  bottom_user.username AS bottom_player_username,
  bottom_user.is_bot AS bottom_player_is_bot,
  top_user.username AS top_player_username,
  top_user.is_bot AS top_player_is_bot
`;

const createMatchQuery = `
INSERT INTO matches (
  id,
  bottom_player_id,
  top_player_id,
  is_rated,
  status,
  winner_side,
  result_reason,
  bottom_rating_before,
  top_rating_before,
  bottom_rating_change,
  top_rating_change,
  started_at,
  finished_at,
  moves,
  game_state
)
VALUES (
  $1, $2, $3, $4, $5, $6, $7,
  $8, $9, $10, $11, $12, $13, $14, $15
)
RETURNING *;
`;

const findMatchByIdQuery = `
SELECT ${MATCH_SELECT_FIELDS}
FROM matches
JOIN users AS bottom_user ON bottom_user.id = matches.bottom_player_id
JOIN users AS top_user ON top_user.id = matches.top_player_id
WHERE matches.id = $1
LIMIT 1;
`;

const findMatchByIdForUpdateQuery = `
SELECT ${MATCH_SELECT_FIELDS}
FROM matches
JOIN users AS bottom_user ON bottom_user.id = matches.bottom_player_id
JOIN users AS top_user ON top_user.id = matches.top_player_id
WHERE matches.id = $1
LIMIT 1
FOR UPDATE OF matches;
`;

const findMatchesByUserIdQuery = `
SELECT ${MATCH_SELECT_FIELDS}
FROM matches
JOIN users AS bottom_user ON bottom_user.id = matches.bottom_player_id
JOIN users AS top_user ON top_user.id = matches.top_player_id
WHERE matches.bottom_player_id = $1::int OR matches.top_player_id = $1::int
ORDER BY COALESCE(finished_at, started_at) DESC;
`;

const listActiveMatchesQuery = `
SELECT ${MATCH_SELECT_FIELDS}
FROM matches
JOIN users AS bottom_user ON bottom_user.id = matches.bottom_player_id
JOIN users AS top_user ON top_user.id = matches.top_player_id
WHERE matches.status = 'active'
ORDER BY matches.started_at DESC;
`;

const findActiveMatchByUserIdQuery = `
SELECT ${MATCH_SELECT_FIELDS}
FROM matches
JOIN users AS bottom_user ON bottom_user.id = matches.bottom_player_id
JOIN users AS top_user ON top_user.id = matches.top_player_id
WHERE matches.status = 'active'
  AND (matches.bottom_player_id = $1::int OR matches.top_player_id = $1::int)
ORDER BY matches.started_at DESC
LIMIT 1;
`;

const updateMatchQuery = `
UPDATE matches
SET
  is_rated = $2,
  status = $3,
  winner_side = $4,
  result_reason = $5,
  bottom_rating_before = $6,
  top_rating_before = $7,
  bottom_rating_change = $8,
  top_rating_change = $9,
  started_at = $10,
  finished_at = $11,
  moves = $12,
  game_state = $13
WHERE id = $1
RETURNING *;
`;

module.exports = {
  createMatchQuery,
  findMatchByIdQuery,
  findMatchByIdForUpdateQuery,
  findMatchesByUserIdQuery,
  listActiveMatchesQuery,
  findActiveMatchByUserIdQuery,
  updateMatchQuery,
};
