-- ============================================================
-- Arche — Complete Database Schema (Supabase / PostgreSQL)
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
  description text        DEFAULT '' CHECK (char_length(description) <= 2000),
  position    integer     NOT NULL DEFAULT 0,
  pinned      boolean     NOT NULL DEFAULT false,
  deleted_at  timestamptz DEFAULT NULL,          -- soft-delete timestamp (NULL = active)
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Collection Items: individual content blocks inside a collection.
CREATE TABLE IF NOT EXISTS collection_items (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid        REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Added for simplified RLS
  type          text        NOT NULL CHECK (type IN ('textbox', 'checkbox_list', 'menu_list', 'card_list')),
  title         text        DEFAULT '' CHECK (char_length(title) <= 255),
  content       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  position      integer     NOT NULL DEFAULT 0,
  pinned        boolean     NOT NULL DEFAULT false,
  deleted_at    timestamptz DEFAULT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Audit Log: track important actions
CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  action      text        NOT NULL,
  entity_type text        NOT NULL,
  entity_id   uuid,
  details     jsonb       DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 2. INDEXES
-- ────────────────────────────────────────────────────────────

-- Fast lookup by owner
CREATE INDEX IF NOT EXISTS collections_user_id_idx ON collections(user_id);
CREATE INDEX IF NOT EXISTS collections_position_idx ON collections(user_id, position);

CREATE INDEX IF NOT EXISTS items_collection_id_idx ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS items_user_id_idx ON collection_items(user_id);
CREATE INDEX IF NOT EXISTS items_position_idx ON collection_items(collection_id, position);

CREATE INDEX IF NOT EXISTS audit_log_user_id_idx ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at);

-- Partial indexes for pinned rows
CREATE INDEX IF NOT EXISTS collections_pinned_idx      ON collections(pinned)      WHERE pinned = true;
CREATE INDEX IF NOT EXISTS collection_items_pinned_idx ON collection_items(pinned) WHERE pinned = true;

-- Partial indexes for soft-deleted rows (fast recycle-bin queries)
CREATE INDEX IF NOT EXISTS collections_deleted_at_idx ON collections(deleted_at)      WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS items_deleted_at_idx       ON collection_items(deleted_at) WHERE deleted_at IS NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 3. TRIGGERS & FUNCTIONS
-- ────────────────────────────────────────────────────────────

-- Auto-update updated_at
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
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_collection_items_updated_at ON collection_items;
CREATE TRIGGER trg_collection_items_updated_at
  BEFORE UPDATE ON collection_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Auto-populate user_id for collection_items based on parent collection
CREATE OR REPLACE FUNCTION populate_item_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id FROM collections WHERE id = NEW.collection_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_item_user_id ON collection_items;
CREATE TRIGGER trg_populate_item_user_id
  BEFORE INSERT ON collection_items
  FOR EACH ROW
  EXECUTE FUNCTION populate_item_user_id();

-- Cleanup function for soft-deleted items (older than 30 days)
CREATE OR REPLACE FUNCTION purge_old_deleted_records()
RETURNS void AS $$
BEGIN
  DELETE FROM collection_items WHERE deleted_at < now() - interval '30 days';
  DELETE FROM collections WHERE deleted_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────

ALTER TABLE collections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log        ENABLE ROW LEVEL SECURITY;

-- Collections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'collections' AND policyname = 'Users can manage their own collections'
  ) THEN
    CREATE POLICY "Users can manage their own collections"
      ON collections FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Collection items (simplified RLS using the new user_id column)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'collection_items' AND policyname = 'Users can manage their own items'
  ) THEN
    CREATE POLICY "Users can manage their own items"
      ON collection_items FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  -- Drop the old policy if it exists to clean up
  DROP POLICY IF EXISTS "Users can manage items in their collections" ON collection_items;
END $$;

-- Audit log (insert only, read own)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'Users can insert their own audit logs'
  ) THEN
    CREATE POLICY "Users can insert their own audit logs"
      ON audit_log FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'Users can read their own audit logs'
  ) THEN
    CREATE POLICY "Users can read their own audit logs"
      ON audit_log FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 5. REALTIME
-- ────────────────────────────────────────────────────────────
-- Enable Supabase Realtime so the frontend receives live
-- Postgres change events for both tables.

-- Drop publication if exists and recreate to ensure it's up to date
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime;
ALTER PUBLICATION supabase_realtime ADD TABLE collections;
ALTER PUBLICATION supabase_realtime ADD TABLE collection_items;


-- ────────────────────────────────────────────────────────────
-- 6. RPC FUNCTIONS FOR BULK UPDATES
-- ────────────────────────────────────────────────────────────

-- RPC for bulk updating collection positions
CREATE OR REPLACE FUNCTION update_collection_positions(updates jsonb)
RETURNS void AS $$
DECLARE
  row record;
BEGIN
  FOR row IN SELECT * FROM jsonb_to_recordset(updates) AS x(id uuid, position integer)
  LOOP
    UPDATE collections SET position = row.position WHERE id = row.id AND user_id = auth.uid();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for bulk updating item positions
CREATE OR REPLACE FUNCTION update_item_positions(updates jsonb)
RETURNS void AS $$
DECLARE
  row record;
BEGIN
  FOR row IN SELECT * FROM jsonb_to_recordset(updates) AS x(id uuid, position integer)
  LOOP
    UPDATE collection_items SET position = row.position WHERE id = row.id AND user_id = auth.uid();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

