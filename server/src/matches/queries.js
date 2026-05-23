const createMatchesTableQuery = `
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  bottom_player_id INTEGER NOT NULL REFERENCES users(id),
  top_player_id INTEGER NOT NULL REFERENCES users(id),
  is_rated BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL,
  winner_side VARCHAR(10),
  result_reason VARCHAR(20),
  bottom_rating_before INTEGER NOT NULL,
  top_rating_before INTEGER NOT NULL,
  bottom_rating_change INTEGER NOT NULL DEFAULT 0,
  top_rating_change INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  moves JSONB NOT NULL DEFAULT '[]'::jsonb,
  game_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT matches_status_check CHECK (status IN ('active', 'finished', 'aborted')),
  CONSTRAINT matches_winner_side_check CHECK (winner_side IN ('bottom', 'top', 'draw') OR winner_side IS NULL),
  CONSTRAINT matches_result_reason_check CHECK (
    result_reason IN ('normal', 'resign', 'timeout', 'aborted') OR result_reason IS NULL
  ),
  CONSTRAINT matches_distinct_players_check CHECK (bottom_player_id <> top_player_id)
);
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
SELECT *
FROM matches
WHERE id = $1
LIMIT 1;
`;

const findMatchesByUserIdQuery = `
SELECT *
FROM matches
WHERE bottom_player_id = $1 OR top_player_id = $1
ORDER BY COALESCE(finished_at, started_at) DESC;
`;

module.exports = {
  createMatchesTableQuery,
  createMatchQuery,
  findMatchByIdQuery,
  findMatchesByUserIdQuery,
};
