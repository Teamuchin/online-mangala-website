/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(15) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      elo INTEGER NOT NULL DEFAULT 1200,
      is_bot BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  pgm.sql(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS elo INTEGER NOT NULL DEFAULT 1200;
  `);

  pgm.sql(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE;
  `);

  pgm.sql(`
    ALTER TABLE users
    ALTER COLUMN username TYPE VARCHAR(15);
  `);

  pgm.sql(`
    ALTER TABLE users
    DROP COLUMN IF EXISTS bio;
  `);

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique_idx
    ON users (LOWER(username));
  `);

  pgm.sql(`
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
      CONSTRAINT matches_status_check CHECK (status IN ('active', 'finished')),
      CONSTRAINT matches_winner_side_check CHECK (
        winner_side IN ('bottom', 'top', 'draw') OR winner_side IS NULL
      ),
      CONSTRAINT matches_result_reason_check CHECK (
        result_reason IN ('normal', 'resign', 'timeout') OR result_reason IS NULL
      ),
      CONSTRAINT matches_distinct_players_check CHECK (bottom_player_id <> top_player_id)
    );
  `);

  pgm.sql(`
    DO $$
    DECLARE
      resolved_match_table_oid OID;
      table_schema_name TEXT;
      bottom_source_column TEXT;
      top_source_column TEXT;
    BEGIN
      SELECT to_regclass('matches') INTO resolved_match_table_oid;

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
        ALTER TABLE matches ADD COLUMN IF NOT EXISTS bottom_player_id INTEGER;
      ELSIF bottom_source_column <> 'bottom_player_id' THEN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = table_schema_name
            AND table_name = 'matches'
            AND column_name = 'bottom_player_id'
        ) THEN
          EXECUTE format(
            'UPDATE matches SET bottom_player_id = COALESCE(bottom_player_id, %I)',
            bottom_source_column
          );
        ELSE
          EXECUTE format(
            'ALTER TABLE matches RENAME COLUMN %I TO bottom_player_id',
            bottom_source_column
          );
        END IF;
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
        ALTER TABLE matches ADD COLUMN IF NOT EXISTS top_player_id INTEGER;
      ELSIF top_source_column <> 'top_player_id' THEN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = table_schema_name
            AND table_name = 'matches'
            AND column_name = 'top_player_id'
        ) THEN
          EXECUTE format(
            'UPDATE matches SET top_player_id = COALESCE(top_player_id, %I)',
            top_source_column
          );
        ELSE
          EXECUTE format(
            'ALTER TABLE matches RENAME COLUMN %I TO top_player_id',
            top_source_column
          );
        END IF;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND column_name = 'is_rated'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = table_schema_name
            AND table_name = 'matches'
            AND column_name = 'isRated'
        ) THEN
          ALTER TABLE matches RENAME COLUMN "isRated" TO is_rated;
        ELSE
          ALTER TABLE matches ADD COLUMN is_rated BOOLEAN NOT NULL DEFAULT FALSE;
        END IF;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND column_name = 'winner_side'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = table_schema_name
            AND table_name = 'matches'
            AND column_name = 'winnerSide'
        ) THEN
          ALTER TABLE matches RENAME COLUMN "winnerSide" TO winner_side;
        ELSE
          ALTER TABLE matches ADD COLUMN winner_side VARCHAR(10);
        END IF;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND column_name = 'result_reason'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = table_schema_name
            AND table_name = 'matches'
            AND column_name = 'resultReason'
        ) THEN
          ALTER TABLE matches RENAME COLUMN "resultReason" TO result_reason;
        ELSE
          ALTER TABLE matches ADD COLUMN result_reason VARCHAR(20);
        END IF;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND column_name = 'bottom_rating_before'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = table_schema_name
            AND table_name = 'matches'
            AND column_name = 'bottomRatingBefore'
        ) THEN
          ALTER TABLE matches RENAME COLUMN "bottomRatingBefore" TO bottom_rating_before;
        ELSE
          ALTER TABLE matches ADD COLUMN bottom_rating_before INTEGER NOT NULL DEFAULT 1200;
        END IF;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND column_name = 'top_rating_before'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = table_schema_name
            AND table_name = 'matches'
            AND column_name = 'topRatingBefore'
        ) THEN
          ALTER TABLE matches RENAME COLUMN "topRatingBefore" TO top_rating_before;
        ELSE
          ALTER TABLE matches ADD COLUMN top_rating_before INTEGER NOT NULL DEFAULT 1200;
        END IF;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND column_name = 'bottom_rating_change'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = table_schema_name
            AND table_name = 'matches'
            AND column_name = 'bottomRatingChange'
        ) THEN
          ALTER TABLE matches RENAME COLUMN "bottomRatingChange" TO bottom_rating_change;
        ELSE
          ALTER TABLE matches ADD COLUMN bottom_rating_change INTEGER NOT NULL DEFAULT 0;
        END IF;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND column_name = 'top_rating_change'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = table_schema_name
            AND table_name = 'matches'
            AND column_name = 'topRatingChange'
        ) THEN
          ALTER TABLE matches RENAME COLUMN "topRatingChange" TO top_rating_change;
        ELSE
          ALTER TABLE matches ADD COLUMN top_rating_change INTEGER NOT NULL DEFAULT 0;
        END IF;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND column_name = 'started_at'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = table_schema_name
            AND table_name = 'matches'
            AND column_name = 'startedAt'
        ) THEN
          ALTER TABLE matches RENAME COLUMN "startedAt" TO started_at;
        ELSE
          ALTER TABLE matches ADD COLUMN started_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        END IF;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND column_name = 'finished_at'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = table_schema_name
            AND table_name = 'matches'
            AND column_name = 'finishedAt'
        ) THEN
          ALTER TABLE matches RENAME COLUMN "finishedAt" TO finished_at;
        ELSE
          ALTER TABLE matches ADD COLUMN finished_at TIMESTAMPTZ;
        END IF;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND column_name = 'game_state'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = table_schema_name
            AND table_name = 'matches'
            AND column_name = 'gameState'
        ) THEN
          ALTER TABLE matches RENAME COLUMN "gameState" TO game_state;
        ELSE
          ALTER TABLE matches ADD COLUMN game_state JSONB NOT NULL DEFAULT '{}'::jsonb;
        END IF;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND column_name = 'moves'
      ) THEN
        ALTER TABLE matches ADD COLUMN moves JSONB NOT NULL DEFAULT '[]'::jsonb;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND constraint_name = 'matches_status_check'
      ) THEN
        ALTER TABLE matches
        ADD CONSTRAINT matches_status_check
        CHECK (status IN ('active', 'finished'));
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND constraint_name = 'matches_winner_side_check'
      ) THEN
        ALTER TABLE matches
        ADD CONSTRAINT matches_winner_side_check
        CHECK (winner_side IN ('bottom', 'top', 'draw') OR winner_side IS NULL);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND constraint_name = 'matches_result_reason_check'
      ) THEN
        ALTER TABLE matches
        ADD CONSTRAINT matches_result_reason_check
        CHECK (result_reason IN ('normal', 'resign', 'timeout') OR result_reason IS NULL);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND constraint_name = 'matches_distinct_players_check'
      ) THEN
        ALTER TABLE matches
        ADD CONSTRAINT matches_distinct_players_check
        CHECK (bottom_player_id <> top_player_id);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND constraint_name = 'matches_bottom_player_id_fkey'
      ) THEN
        ALTER TABLE matches
        ADD CONSTRAINT matches_bottom_player_id_fkey
        FOREIGN KEY (bottom_player_id) REFERENCES users(id);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = table_schema_name
          AND table_name = 'matches'
          AND constraint_name = 'matches_top_player_id_fkey'
      ) THEN
        ALTER TABLE matches
        ADD CONSTRAINT matches_top_player_id_fkey
        FOREIGN KEY (top_player_id) REFERENCES users(id);
      END IF;
    END
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      RAISE EXCEPTION 'Rollback for 20260527011000_initial_schema is intentionally unsupported because it would destroy existing users and matches data.';
    END
    $$;
  `);
};
