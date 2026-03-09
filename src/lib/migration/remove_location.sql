-- Remove location-based columns from groups table
-- Run this in your Supabase SQL Editor to clean up location fields

ALTER TABLE groups DROP COLUMN IF EXISTS lat;
ALTER TABLE groups DROP COLUMN IF EXISTS lng;

-- Drop any indexes related to geospatial data if they exist
DROP INDEX IF EXISTS idx_groups_geo;
DROP INDEX IF EXISTS idx_groups_lat_lng;

-- Drop the nearby_groups function if it exists
DROP FUNCTION IF EXISTS nearby_groups(double precision, double precision, double precision);