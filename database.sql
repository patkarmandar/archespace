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
-- Each user can have many collections; deleting a user cascades
-- to all their collections.
CREATE TABLE IF NOT EXISTS collections (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        text        NOT NULL CHECK (char_length(name) <= 255),
  description text        DEFAULT '' CHECK (char_length(description) <= 2000),
  position    integer     DEFAULT 0,
  pinned      boolean     DEFAULT false,        -- pin to top of dashboard
  deleted_at  timestamptz DEFAULT NULL,          -- soft-delete timestamp (NULL = active)
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Collection Items: individual content blocks inside a collection.
-- `type` constrains the kind of editor rendered on the frontend.
-- `content` is a flexible JSONB column whose shape varies by type:
--   textbox       → { text: string }
--   checkbox_list → { items: [{ id, text, checked }] }
--   menu_list     → { items: [{ id, text }] }
--   card_list     → { items: [{ id, title, description }] }
-- `position` controls display order within the collection.
CREATE TABLE IF NOT EXISTS collection_items (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid        REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  type          text        NOT NULL CHECK (type IN ('textbox', 'checkbox_list', 'menu_list', 'card_list')),
  title         text        DEFAULT '' CHECK (char_length(title) <= 255),
  content       jsonb       DEFAULT '{}',
  position      integer     DEFAULT 0,
  pinned        boolean     DEFAULT false,        -- pin to top of collection
  deleted_at    timestamptz DEFAULT NULL,          -- soft-delete timestamp (NULL = active)
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 2. INDEXES
-- ────────────────────────────────────────────────────────────

-- Fast lookup of collections by owner
CREATE INDEX IF NOT EXISTS collections_user_id_idx ON collections(user_id);
CREATE INDEX IF NOT EXISTS collections_position_idx ON collections(user_id, position);

-- Fast lookup of items within a collection, ordered by position
CREATE INDEX IF NOT EXISTS items_collection_id_idx ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS items_position_idx      ON collection_items(collection_id, position);

-- Partial indexes for pinned rows (only index the TRUE rows — very small)
CREATE INDEX IF NOT EXISTS collections_pinned_idx      ON collections(pinned)      WHERE pinned = true;
CREATE INDEX IF NOT EXISTS collection_items_pinned_idx ON collection_items(pinned) WHERE pinned = true;

-- Partial indexes for soft-deleted rows (fast recycle-bin queries)
CREATE INDEX IF NOT EXISTS collections_deleted_at_idx ON collections(deleted_at)      WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS items_deleted_at_idx       ON collection_items(deleted_at) WHERE deleted_at IS NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 3. AUTOMATIC updated_at TRIGGER
-- ────────────────────────────────────────────────────────────
-- This removes the need for the frontend to manually set
-- updated_at on every mutation — Postgres handles it.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to collections
DROP TRIGGER IF EXISTS trg_collections_updated_at ON collections;
CREATE TRIGGER trg_collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Apply to collection_items
DROP TRIGGER IF EXISTS trg_collection_items_updated_at ON collection_items;
CREATE TRIGGER trg_collection_items_updated_at
  BEFORE UPDATE ON collection_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();


-- ────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS)
-- ────────────────────────────────────────────────────────────
-- Only the authenticated owner can read/write their own data.

ALTER TABLE collections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- Collections: user can only access rows where user_id matches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'collections'
      AND policyname = 'Users can manage their own collections'
  ) THEN
    CREATE POLICY "Users can manage their own collections"
      ON collections FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Collection items: user can access items whose parent collection
-- belongs to them (sub-query join to collections table).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'collection_items'
      AND policyname = 'Users can manage items in their collections'
  ) THEN
    CREATE POLICY "Users can manage items in their collections"
      ON collection_items FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM collections
          WHERE collections.id = collection_items.collection_id
            AND collections.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM collections
          WHERE collections.id = collection_items.collection_id
            AND collections.user_id = auth.uid()
        )
      );
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────
-- 5. REALTIME
-- ────────────────────────────────────────────────────────────
-- Enable Supabase Realtime so the frontend receives live
-- Postgres change events for both tables.

ALTER PUBLICATION supabase_realtime ADD TABLE collections;
ALTER PUBLICATION supabase_realtime ADD TABLE collection_items;
