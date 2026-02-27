-- Add columns needed for proximity groups and synchronized playback
ALTER TABLE groups ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS lng double precision;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS playback_started_at timestamptz;

-- Ensure RLS is enabled with open policy (idempotent)
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'groups' AND policyname = 'Public Access'
  ) THEN
    CREATE POLICY "Public Access" ON groups FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
