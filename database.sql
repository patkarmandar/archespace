-- ============================================================
-- Arche - Database Schema (Supabase / PostgreSQL)
-- ============================================================
--
-- This is the single, idempotent schema file for the Arche app.
-- Run it in the Supabase SQL Editor to set up (or update) all
-- tables, indexes, RLS policies, triggers, and realtime config.
--
-- Safe to re-run: every statement uses IF NOT EXISTS / IF EXISTS
-- guards so nothing breaks if the objects already exist.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. TABLES
-- ────────────────────────────────────────────────────────────

-- Collections: top-level containers owned by a single user.
CREATE TABLE IF NOT EXISTS collections (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text        NOT NULL CHECK (char_length(name) <= 255),
  description text        NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  position    integer     NOT NULL DEFAULT 0,
  pinned      boolean     NOT NULL DEFAULT false,
  deleted_at  timestamptz DEFAULT NULL,          -- soft-delete; NULL = active
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Collection Items: individual content blocks inside a collection.
CREATE TABLE IF NOT EXISTS collection_items (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid        REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type          text        NOT NULL CHECK (type IN ('textbox', 'checkbox_list', 'menu_list', 'card_list')),
  title         text        NOT NULL DEFAULT '' CHECK (char_length(title) <= 255),
  content       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  position      integer     NOT NULL DEFAULT 0,
  pinned        boolean     NOT NULL DEFAULT false,
  deleted_at    timestamptz DEFAULT NULL,
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


-- ────────────────────────────────────────────────────────────
-- 2. INDEXES
-- ────────────────────────────────────────────────────────────

-- Collections
CREATE INDEX IF NOT EXISTS collections_user_id_idx     ON collections(user_id);
CREATE INDEX IF NOT EXISTS collections_position_idx    ON collections(user_id, position);
CREATE INDEX IF NOT EXISTS collections_pinned_idx      ON collections(pinned)     WHERE pinned = true;
CREATE INDEX IF NOT EXISTS collections_deleted_at_idx  ON collections(deleted_at) WHERE deleted_at IS NOT NULL;

-- Collection items
CREATE INDEX IF NOT EXISTS items_collection_id_idx     ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS items_user_id_idx           ON collection_items(user_id);
CREATE INDEX IF NOT EXISTS items_position_idx          ON collection_items(collection_id, position);
CREATE INDEX IF NOT EXISTS collection_items_pinned_idx ON collection_items(pinned)     WHERE pinned = true;
CREATE INDEX IF NOT EXISTS items_deleted_at_idx        ON collection_items(deleted_at) WHERE deleted_at IS NOT NULL;

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

DROP TRIGGER IF EXISTS trg_collections_updated_at ON collections;
CREATE TRIGGER trg_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_collection_items_updated_at ON collection_items;
CREATE TRIGGER trg_collection_items_updated_at
  BEFORE UPDATE ON collection_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-populate user_id on collection_items from the parent collection.
CREATE OR REPLACE FUNCTION populate_item_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id
    FROM collections
    WHERE id = NEW.collection_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_item_user_id ON collection_items;
CREATE TRIGGER trg_populate_item_user_id
  BEFORE INSERT ON collection_items
  FOR EACH ROW EXECUTE FUNCTION populate_item_user_id();

-- Hard-delete records soft-deleted for more than 30 days.
-- Wire this up to pg_cron or a Supabase scheduled Edge Function.
CREATE OR REPLACE FUNCTION purge_old_deleted_records()
RETURNS void AS $$
BEGIN
  DELETE FROM collection_items WHERE deleted_at < now() - interval '30 days';
  DELETE FROM collections       WHERE deleted_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────

ALTER TABLE collections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log        ENABLE ROW LEVEL SECURITY;

-- Collections: full CRUD for the owning user only.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'collections'
      AND policyname = 'Users can manage their own collections'
  ) THEN
    CREATE POLICY "Users can manage their own collections"
      ON collections FOR ALL
      USING     (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Collection items: full CRUD for the owning user only.
DO $$ BEGIN
  -- Remove the old join-based policy if it was ever created.
  DROP POLICY IF EXISTS "Users can manage items in their collections" ON collection_items;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'collection_items'
      AND policyname = 'Users can manage their own items'
  ) THEN
    CREATE POLICY "Users can manage their own items"
      ON collection_items FOR ALL
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


-- ────────────────────────────────────────────────────────────
-- 5. REALTIME
-- ────────────────────────────────────────────────────────────

DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER  PUBLICATION supabase_realtime ADD TABLE collections;
ALTER  PUBLICATION supabase_realtime ADD TABLE collection_items;


-- ────────────────────────────────────────────────────────────
-- 6. RPC FUNCTIONS FOR BULK UPDATES
-- ────────────────────────────────────────────────────────────

-- Bulk-update collection positions (ownership enforced via auth.uid()).
CREATE OR REPLACE FUNCTION update_collection_positions(updates jsonb)
RETURNS void AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM jsonb_to_recordset(updates) AS x(id uuid, position integer)
  LOOP
    UPDATE collections
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
    UPDATE collection_items
       SET position = r.position
     WHERE id = r.id AND user_id = auth.uid();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- 7. SCHEMA MIGRATIONS (safe to re-run)
-- ────────────────────────────────────────────────────────────

ALTER TABLE collections      ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS color text DEFAULT NULL;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS tags  jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS collections_archived_at_idx ON collections(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS items_archived_at_idx       ON collection_items(archived_at) WHERE archived_at IS NOT NULL;
