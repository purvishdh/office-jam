-- DROP old table if exists (safe)
drop table if exists groups;

-- ✅ CORRECTED: Single jsonb column (not array)
create table groups (
  id text primary key default gen_random_uuid(),
  name text not null,
  members uuid[] default '{}',
  playlist jsonb default '[]',  -- ✅ Single jsonb with array INSIDE
  current_index integer default 0,
  is_playing boolean default false,
  created_at timestamp default now()
);

-- Enable realtime
alter publication supabase_realtime add table groups;

-- RLS: Anyone can read/write (office jukebox)
create policy "Public Access" on groups for all using (true);
