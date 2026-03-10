-- DJ Mode Migration
-- Run this SQL in your Supabase SQL Editor

-- Add DJ mode columns to existing groups table
ALTER TABLE groups ADD COLUMN IF NOT EXISTS dj_mode BOOLEAN DEFAULT false;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS dj_name TEXT;

-- Optional: Set existing groups to open mode (default is already false, but this makes it explicit)
UPDATE groups SET dj_mode = false WHERE dj_mode IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'groups' 
ORDER BY ordinal_position;
