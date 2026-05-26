const MATCH_SELECT_FIELDS = `
  matches.*,
  bottom_user.username AS bottom_player_username,
  bottom_user.is_bot AS bottom_player_is_bot,
  top_user.username AS top_player_username,
  top_user.is_bot AS top_player_is_bot
`;

const createMatchesTableQuery = `
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  bottom_player_id TEXT NOT NULL,
  top_player_id TEXT NOT NULL,
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
  CONSTRAINT matches_status_check CHECK (status IN ('active', 'finished')),
  CONSTRAINT matches_winner_side_check CHECK (winner_side IN ('bottom', 'top', 'draw') OR winner_side IS NULL),
  CONSTRAINT matches_result_reason_check CHECK (
    result_reason IN ('normal', 'resign', 'timeout') OR result_reason IS NULL
  ),
  CONSTRAINT matches_distinct_players_check CHECK (bottom_player_id <> top_player_id)
);
`;

const ensureLegacyMatchPlayerIdColumnsQuery = `
DO $$
DECLARE
  resolved_match_table_oid OID;
  table_schema_name TEXT;
  bottom_source_column TEXT;
  top_source_column TEXT;
BEGIN
  SELECT to_regclass('matches')
  INTO resolved_match_table_oid;

  IF resolved_match_table_oid IS NULL THEN
    RETURN;
  END IF;

  SELECT namespace.nspname
  INTO table_schema_name
  FROM pg_class AS class
  JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
  WHERE class.oid = resolved_match_table_oid;

  SELECT column_name
  INTO bottom_source_column
  FROM information_schema.columns
  WHERE table_schema = table_schema_name
    AND table_name = 'matches'
    AND column_name IN (
      'bottom_player_id',
      'bottom_player',
      'bottomplayerid',
      'bottom_playerid',
      'bottom_user_id',
      'bottomuserid',
      'bottom_user',
      'bottomplayer'
    )
  ORDER BY CASE column_name
    WHEN 'bottom_player_id' THEN 0
    WHEN 'bottom_player' THEN 1
    WHEN 'bottom_playerid' THEN 2
    WHEN 'bottomplayerid' THEN 3
    WHEN 'bottom_user_id' THEN 4
    WHEN 'bottomuserid' THEN 5
    WHEN 'bottom_user' THEN 6
    ELSE 7
  END
  LIMIT 1;

  IF bottom_source_column IS NULL THEN
    ALTER TABLE matches ADD COLUMN IF NOT EXISTS bottom_player_id TEXT;
  ELSIF bottom_source_column <> 'bottom_player_id' THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = table_schema_name
        AND table_name = 'matches'
        AND column_name = 'bottom_player_id'
    ) THEN
      EXECUTE format(
        'UPDATE matches SET bottom_player_id = COALESCE(bottom_player_id::text, %I::text)',
        bottom_source_column
      );
    ELSE
      EXECUTE format(
        'ALTER TABLE matches RENAME COLUMN %I TO bottom_player_id',
        bottom_source_column
      );
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = table_schema_name
      AND table_name = 'matches'
      AND column_name = 'bottom_player_id'
  ) THEN
    ALTER TABLE matches
    ALTER COLUMN bottom_player_id TYPE TEXT
    USING bottom_player_id::text;
  END IF;

  SELECT column_name
  INTO top_source_column
  FROM information_schema.columns
  WHERE table_schema = table_schema_name
    AND table_name = 'matches'
    AND column_name IN (
      'top_player_id',
      'top_player',
      'topplayerid',
      'top_playerid',
      'top_user_id',
      'topuserid',
      'top_user',
      'topplayer'
    )
  ORDER BY CASE column_name
    WHEN 'top_player_id' THEN 0
    WHEN 'top_player' THEN 1
    WHEN 'top_playerid' THEN 2
    WHEN 'topplayerid' THEN 3
    WHEN 'top_user_id' THEN 4
    WHEN 'topuserid' THEN 5
    WHEN 'top_user' THEN 6
    ELSE 7
  END
  LIMIT 1;

  IF top_source_column IS NULL THEN
    ALTER TABLE matches ADD COLUMN IF NOT EXISTS top_player_id TEXT;
  ELSIF top_source_column <> 'top_player_id' THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = table_schema_name
        AND table_name = 'matches'
        AND column_name = 'top_player_id'
    ) THEN
      EXECUTE format(
        'UPDATE matches SET top_player_id = COALESCE(top_player_id::text, %I::text)',
        top_source_column
      );
    ELSE
      EXECUTE format(
        'ALTER TABLE matches RENAME COLUMN %I TO top_player_id',
        top_source_column
      );
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = table_schema_name
      AND table_name = 'matches'
      AND column_name = 'top_player_id'
  ) THEN
    ALTER TABLE matches
    ALTER COLUMN top_player_id TYPE TEXT
    USING top_player_id::text;
  END IF;
END
$$;
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
JOIN users AS bottom_user ON bottom_user.id::text = matches.bottom_player_id::text
JOIN users AS top_user ON top_user.id::text = matches.top_player_id::text
WHERE matches.id = $1
LIMIT 1;
`;

const findMatchesByUserIdQuery = `
SELECT ${MATCH_SELECT_FIELDS}
FROM matches
JOIN users AS bottom_user ON bottom_user.id::text = matches.bottom_player_id::text
JOIN users AS top_user ON top_user.id::text = matches.top_player_id::text
WHERE matches.bottom_player_id::text = $1::text OR matches.top_player_id::text = $1::text
ORDER BY COALESCE(finished_at, started_at) DESC;
`;

const listActiveMatchesQuery = `
SELECT ${MATCH_SELECT_FIELDS}
FROM matches
JOIN users AS bottom_user ON bottom_user.id::text = matches.bottom_player_id::text
JOIN users AS top_user ON top_user.id::text = matches.top_player_id::text
WHERE matches.status = 'active'
ORDER BY matches.started_at DESC;
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
  createMatchesTableQuery,
  ensureLegacyMatchPlayerIdColumnsQuery,
  createMatchQuery,
  findMatchByIdQuery,
  findMatchesByUserIdQuery,
  listActiveMatchesQuery,
  updateMatchQuery,
};
