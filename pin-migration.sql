-- Arche — Pin feature migration
-- Run in Supabase SQL Editor

ALTER TABLE collections      ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS pinned boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS collections_pinned_idx      ON collections(pinned)      WHERE pinned = true;
CREATE INDEX IF NOT EXISTS collection_items_pinned_idx ON collection_items(pinned) WHERE pinned = true;
