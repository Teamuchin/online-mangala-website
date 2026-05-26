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
        FROM information_schema.columns
        WHERE table_name = 'matches'
          AND column_name = 'bottom_player_id'
      ) THEN
        ALTER TABLE matches
        ALTER COLUMN bottom_player_id TYPE INTEGER
        USING NULLIF(bottom_player_id, '')::integer;
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'matches'
          AND column_name = 'top_player_id'
      ) THEN
        ALTER TABLE matches
        ALTER COLUMN top_player_id TYPE INTEGER
        USING NULLIF(top_player_id, '')::integer;
      END IF;
    END
    $$;
  `);
};
