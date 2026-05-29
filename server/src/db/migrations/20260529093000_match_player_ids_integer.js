exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('matches') IS NULL THEN
        RETURN;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'matches'
          AND constraint_name = 'matches_distinct_players_check'
      ) THEN
        ALTER TABLE matches DROP CONSTRAINT matches_distinct_players_check;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'matches'
          AND constraint_name = 'matches_bottom_player_id_fkey'
      ) THEN
        ALTER TABLE matches DROP CONSTRAINT matches_bottom_player_id_fkey;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'matches'
          AND constraint_name = 'matches_top_player_id_fkey'
      ) THEN
        ALTER TABLE matches DROP CONSTRAINT matches_top_player_id_fkey;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'matches'
          AND column_name = 'bottom_player_id'
      ) THEN
        ALTER TABLE matches
        ALTER COLUMN bottom_player_id TYPE INTEGER
        USING NULLIF(TRIM(bottom_player_id), '')::integer;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'matches'
          AND column_name = 'top_player_id'
      ) THEN
        ALTER TABLE matches
        ALTER COLUMN top_player_id TYPE INTEGER
        USING NULLIF(TRIM(top_player_id), '')::integer;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'matches'
          AND column_name = 'bottom_player_id'
      ) THEN
        ALTER TABLE matches
        ALTER COLUMN bottom_player_id SET NOT NULL;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'matches'
          AND column_name = 'top_player_id'
      ) THEN
        ALTER TABLE matches
        ALTER COLUMN top_player_id SET NOT NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'matches'
          AND constraint_name = 'matches_bottom_player_id_fkey'
      ) THEN
        ALTER TABLE matches
        ADD CONSTRAINT matches_bottom_player_id_fkey
        FOREIGN KEY (bottom_player_id) REFERENCES users(id);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'matches'
          AND constraint_name = 'matches_top_player_id_fkey'
      ) THEN
        ALTER TABLE matches
        ADD CONSTRAINT matches_top_player_id_fkey
        FOREIGN KEY (top_player_id) REFERENCES users(id);
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'matches'
          AND constraint_name = 'matches_distinct_players_check'
      ) THEN
        ALTER TABLE matches
        ADD CONSTRAINT matches_distinct_players_check
        CHECK (bottom_player_id <> top_player_id);
      END IF;
    END
    $$;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DO $$
    BEGIN
      IF to_regclass('matches') IS NULL THEN
        RETURN;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'matches'
          AND constraint_name = 'matches_distinct_players_check'
      ) THEN
        ALTER TABLE matches DROP CONSTRAINT matches_distinct_players_check;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'matches'
          AND constraint_name = 'matches_bottom_player_id_fkey'
      ) THEN
        ALTER TABLE matches DROP CONSTRAINT matches_bottom_player_id_fkey;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'matches'
          AND constraint_name = 'matches_top_player_id_fkey'
      ) THEN
        ALTER TABLE matches DROP CONSTRAINT matches_top_player_id_fkey;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'matches'
          AND column_name = 'bottom_player_id'
      ) THEN
        ALTER TABLE matches
        ALTER COLUMN bottom_player_id TYPE TEXT
        USING bottom_player_id::text;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'matches'
          AND column_name = 'top_player_id'
      ) THEN
        ALTER TABLE matches
        ALTER COLUMN top_player_id TYPE TEXT
        USING top_player_id::text;
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_name = 'matches'
          AND constraint_name = 'matches_distinct_players_check'
      ) THEN
        ALTER TABLE matches
        ADD CONSTRAINT matches_distinct_players_check
        CHECK (bottom_player_id <> top_player_id);
      END IF;
    END
    $$;
  `);
};
