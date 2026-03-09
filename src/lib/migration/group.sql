-- CREATE groups table with correct schema (without location fields)
-- Run this in your Supabase SQL Editor

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  playlist jsonb DEFAULT '[]',
  current_index integer DEFAULT 0,
  is_playing boolean DEFAULT false,
  playback_started_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Remove old location columns if they exist
ALTER TABLE groups DROP COLUMN IF EXISTS lat;
ALTER TABLE groups DROP COLUMN IF EXISTS lng;
ALTER TABLE groups DROP COLUMN IF EXISTS members;

-- Enable RLS with public access policy
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Public Access" ON groups;
CREATE POLICY "Public Access" ON groups FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE groups;
