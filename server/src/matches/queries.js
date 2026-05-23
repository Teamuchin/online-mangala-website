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

module.exports = {
  createMatchesTableQuery,
};
