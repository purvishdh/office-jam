-- Manual migration to fix missing playback_started_at column
-- Run this in the Supabase SQL Editor

-- Add missing column
ALTER TABLE groups ADD COLUMN IF NOT EXISTS playback_started_at timestamptz;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'groups' 
AND table_schema = 'public'
ORDER BY ordinal_position;