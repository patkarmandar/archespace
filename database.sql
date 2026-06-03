-- ============================================================
-- Arche - Database Schema (Supabase / PostgreSQL)
-- ============================================================
--
-- This is the baseline schema file for the Arche app.
-- Run it in the Supabase SQL Editor to set up a new project with
-- all tables, indexes, RLS policies, triggers, and realtime config.
--
-- Safe to re-run: every statement uses IF NOT EXISTS / IF EXISTS
-- guards so nothing breaks if the objects already exist.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. TABLES
-- ────────────────────────────────────────────────────────────

-- Spaces: top-level containers owned by a single user.
CREATE TABLE IF NOT EXISTS spaces (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text        NOT NULL,
  description text        NOT NULL DEFAULT '',
  position    integer     NOT NULL DEFAULT 0,
  pinned      boolean     NOT NULL DEFAULT false,
  color       text        DEFAULT NULL,
  tags        jsonb       NOT NULL DEFAULT '[]'::jsonb,
  deleted_at  timestamptz DEFAULT NULL,          -- soft-delete; NULL = active
  archived_at timestamptz DEFAULT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Space Items: individual content blocks inside a space.
CREATE TABLE IF NOT EXISTS space_items (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id uuid        REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type          text        NOT NULL CHECK (type IN ('textbox', 'checkbox_list', 'menu_list', 'card_list')),
  title         text        NOT NULL DEFAULT '',
  content       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  position      integer     NOT NULL DEFAULT 0,
  pinned        boolean     NOT NULL DEFAULT false,
  deleted_at    timestamptz DEFAULT NULL,
  archived_at   timestamptz DEFAULT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Audit Log: immutable record of important user actions.
CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  action      text        NOT NULL,
  entity_type text        NOT NULL,
  entity_id   uuid,
  details     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- User Encryption: per-user metadata for client-side encrypted vaults.
-- Stores PBKDF2 salt + encrypted verifier, never the raw key.
CREATE TABLE IF NOT EXISTS user_encryption (
  user_id      uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  salt         text        NOT NULL,
  key_check    text        NOT NULL,
  wrapped_key  text        DEFAULT NULL,
  vault_format text        DEFAULT 'legacy',
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- PIN-wrapped vaults (run on existing projects):
ALTER TABLE user_encryption ADD COLUMN IF NOT EXISTS wrapped_key text DEFAULT NULL;
ALTER TABLE user_encryption ADD COLUMN IF NOT EXISTS vault_format text DEFAULT 'legacy';


-- ────────────────────────────────────────────────────────────
-- 2. INDEXES
-- ────────────────────────────────────────────────────────────

-- Spaces
CREATE INDEX IF NOT EXISTS spaces_user_id_idx     ON spaces(user_id);
CREATE INDEX IF NOT EXISTS spaces_position_idx    ON spaces(user_id, position);
CREATE INDEX IF NOT EXISTS spaces_pinned_idx      ON spaces(pinned)     WHERE pinned = true;
CREATE INDEX IF NOT EXISTS spaces_deleted_at_idx  ON spaces(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS spaces_archived_at_idx ON spaces(archived_at) WHERE archived_at IS NOT NULL;

-- Space items
CREATE INDEX IF NOT EXISTS items_space_id_idx     ON space_items(space_id);
CREATE INDEX IF NOT EXISTS items_user_id_idx           ON space_items(user_id);
CREATE INDEX IF NOT EXISTS items_position_idx          ON space_items(space_id, position);
CREATE INDEX IF NOT EXISTS space_items_pinned_idx ON space_items(pinned)     WHERE pinned = true;
CREATE INDEX IF NOT EXISTS items_deleted_at_idx        ON space_items(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS items_archived_at_idx       ON space_items(archived_at) WHERE archived_at IS NOT NULL;

-- Audit log
CREATE INDEX IF NOT EXISTS audit_log_user_id_idx       ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx    ON audit_log(created_at);


-- ────────────────────────────────────────────────────────────
-- 3. TRIGGERS & FUNCTIONS
-- ────────────────────────────────────────────────────────────

-- Auto-update updated_at on every row change.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_spaces_updated_at ON spaces;
CREATE TRIGGER trg_spaces_updated_at
  BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_space_items_updated_at ON space_items;
CREATE TRIGGER trg_space_items_updated_at
  BEFORE UPDATE ON space_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-populate user_id on space_items from the parent space.
CREATE OR REPLACE FUNCTION populate_item_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id
    FROM spaces
    WHERE id = NEW.space_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_item_user_id ON space_items;
CREATE TRIGGER trg_populate_item_user_id
  BEFORE INSERT ON space_items
  FOR EACH ROW EXECUTE FUNCTION populate_item_user_id();

-- Hard-delete records soft-deleted for more than 30 days.
-- Wire this up to pg_cron or a Supabase scheduled Edge Function.
CREATE OR REPLACE FUNCTION purge_old_deleted_records()
RETURNS void AS $$
BEGIN
  DELETE FROM space_items WHERE deleted_at < now() - interval '30 days';
  DELETE FROM spaces       WHERE deleted_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────

ALTER TABLE spaces      ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_encryption  ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_encryption TO authenticated;

-- Spaces: full CRUD for the owning user only.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'spaces'
      AND policyname = 'Users can manage their own spaces'
  ) THEN
    CREATE POLICY "Users can manage their own spaces"
      ON spaces FOR ALL
      USING     (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Space items: full CRUD for the owning user only.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'space_items'
      AND policyname = 'Users can manage their own items'
  ) THEN
    CREATE POLICY "Users can manage their own items"
      ON space_items FOR ALL
      USING     (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Audit log: users may insert and read their own rows only.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_log'
      AND policyname = 'Users can insert their own audit logs'
  ) THEN
    CREATE POLICY "Users can insert their own audit logs"
      ON audit_log FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_log'
      AND policyname = 'Users can read their own audit logs'
  ) THEN
    CREATE POLICY "Users can read their own audit logs"
      ON audit_log FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- User encryption metadata: full CRUD for the owning user only.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_encryption'
      AND policyname = 'Users manage own encryption metadata'
  ) THEN
    CREATE POLICY "Users manage own encryption metadata"
      ON user_encryption FOR ALL
      USING     (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 5. REALTIME
-- ────────────────────────────────────────────────────────────

DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER  PUBLICATION supabase_realtime ADD TABLE spaces;
ALTER  PUBLICATION supabase_realtime ADD TABLE space_items;


-- ────────────────────────────────────────────────────────────
-- 6. RPC FUNCTIONS FOR BULK UPDATES
-- ────────────────────────────────────────────────────────────

-- Bulk-update space positions (ownership enforced via auth.uid()).
CREATE OR REPLACE FUNCTION update_space_positions(updates jsonb)
RETURNS void AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM jsonb_to_recordset(updates) AS x(id uuid, position integer)
  LOOP
    UPDATE spaces
       SET position = r.position
     WHERE id = r.id AND user_id = auth.uid();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk-update item positions (ownership enforced via auth.uid()).
CREATE OR REPLACE FUNCTION update_item_positions(updates jsonb)
RETURNS void AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM jsonb_to_recordset(updates) AS x(id uuid, position integer)
  LOOP
    UPDATE space_items
       SET position = r.position
     WHERE id = r.id AND user_id = auth.uid();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
