-- ============================================================
-- Arche — Recycle Bin Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add soft-delete column to collections
ALTER TABLE collections ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Add soft-delete column to collection_items
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for fast bin queries
CREATE INDEX IF NOT EXISTS collections_deleted_at_idx ON collections(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS items_deleted_at_idx ON collection_items(deleted_at) WHERE deleted_at IS NOT NULL;
