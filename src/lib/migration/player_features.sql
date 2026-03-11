-- Add new player features to groups table
-- Run this migration in Supabase SQL Editor

ALTER TABLE groups
ADD COLUMN IF NOT EXISTS shuffle_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS loop_mode BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS playback_speed REAL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS crossfade_duration INTEGER DEFAULT 0;

-- Add constraints
ALTER TABLE groups
ADD CONSTRAINT playback_speed_range CHECK (playback_speed >= 0.25 AND playback_speed <= 2.0),
ADD CONSTRAINT crossfade_duration_range CHECK (crossfade_duration >= 0 AND crossfade_duration <= 10);

-- Add comments
COMMENT ON COLUMN groups.shuffle_mode IS 'Enable shuffle/random playback order';
COMMENT ON COLUMN groups.loop_mode IS 'Enable playlist looping when end is reached';
COMMENT ON COLUMN groups.playback_speed IS 'Audio playback speed multiplier (0.25x - 2x)';
COMMENT ON COLUMN groups.crossfade_duration IS 'Crossfade duration in seconds (0-10), 0 = disabled';
