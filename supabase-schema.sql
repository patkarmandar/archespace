-- ============================================================
-- Arche - Supabase Schema Setup
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Collections table
create table if not exists collections (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Collection items table
create table if not exists collection_items (
  id uuid default gen_random_uuid() primary key,
  collection_id uuid references collections(id) on delete cascade not null,
  type text not null check (type in ('textbox', 'checkbox_list', 'menu_list', 'card_list')),
  title text default '',
  content jsonb default '{}',
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for performance
create index if not exists collections_user_id_idx on collections(user_id);
create index if not exists items_collection_id_idx on collection_items(collection_id);
create index if not exists items_position_idx on collection_items(collection_id, position);

-- Enable Row Level Security
alter table collections enable row level security;
alter table collection_items enable row level security;

-- RLS Policies: only the owner can access their data
create policy "Users can manage their own collections"
  on collections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage items in their collections"
  on collection_items for all
  using (
    exists (
      select 1 from collections
      where collections.id = collection_items.collection_id
      and collections.user_id = auth.uid()
    )
  );

-- Enable Realtime for both tables
alter publication supabase_realtime add table collections;
alter publication supabase_realtime add table collection_items;
