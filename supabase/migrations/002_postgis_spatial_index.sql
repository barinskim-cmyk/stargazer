-- =============================================================================
-- Migration 002: PostGIS spatial index for sky constellations
-- Run in Supabase SQL editor: https://app.supabase.com → SQL Editor
--
-- Purpose: replaces slow gx/gy range queries (B-tree) with GiST spatial index.
-- Required for sky to scale to 300k+ constellations without DB slowdowns.
-- =============================================================================

-- 1. Enable PostGIS (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add a geography point column derived from gx/gy (stored as 0–1 fractions)
--    Mapping: gx → longitude [-180, 180],  gy → latitude [-90, 90]
ALTER TABLE constellations
  ADD COLUMN IF NOT EXISTS geo geography(Point, 4326);

-- 3. Backfill existing rows
UPDATE constellations
  SET geo = ST_SetSRID(
    ST_MakePoint((gx - 0.5) * 360, (gy - 0.5) * 180),
    4326
  )::geography
  WHERE gx IS NOT NULL AND gy IS NOT NULL AND geo IS NULL;

-- 4. GiST spatial index (replaces two B-tree scans with one fast 2D lookup)
CREATE INDEX IF NOT EXISTS constellations_geo_idx
  ON constellations USING GIST (geo);

-- 5. Optional: B-tree indexes on gx/gy for fallback range queries
CREATE INDEX IF NOT EXISTS constellations_gx_idx ON constellations (gx);
CREATE INDEX IF NOT EXISTS constellations_gy_idx ON constellations (gy);

-- 6. Trigger: auto-populate geo on INSERT/UPDATE
CREATE OR REPLACE FUNCTION sync_constellation_geo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.gx IS NOT NULL AND NEW.gy IS NOT NULL THEN
    NEW.geo := ST_SetSRID(
      ST_MakePoint((NEW.gx - 0.5) * 360, (NEW.gy - 0.5) * 180),
      4326
    )::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_geo ON constellations;
CREATE TRIGGER trg_sync_geo
  BEFORE INSERT OR UPDATE OF gx, gy ON constellations
  FOR EACH ROW EXECUTE FUNCTION sync_constellation_geo();

-- 7. RPC function for viewport bbox queries (used by _skyBboxLoad in sky-screen.js)
--    Accepts lon/lat bbox (derived from gx/gy world fractions) and returns rows.
CREATE OR REPLACE FUNCTION constellations_in_bbox(
  lon_min float8,
  lat_min float8,
  lon_max float8,
  lat_max float8,
  max_rows int DEFAULT 500
)
RETURNS TABLE (
  id          uuid,
  name        text,
  data        jsonb,
  user_id     uuid,
  gx          float8,
  gy          float8,
  created_at  timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id, name, data, user_id, gx, gy, created_at
  FROM   constellations
  WHERE  geo && ST_MakeEnvelope(lon_min, lat_min, lon_max, lat_max, 4326)
  ORDER  BY created_at DESC
  LIMIT  max_rows;
$$;

-- Grant access to anon/authenticated roles (Supabase default)
GRANT EXECUTE ON FUNCTION constellations_in_bbox TO anon, authenticated;

-- =============================================================================
-- After running this migration, update sky-screen.js _skyBboxLoad to use RPC:
--
--   const lonMin = (x0 - 0.5) * 360, lonMax = (x1 - 0.5) * 360;
--   const latMin = (y0 - 0.5) * 180, latMax = (y1 - 0.5) * 180;
--   const { data, error } = await sb.rpc('constellations_in_bbox', {
--     lon_min: lonMin, lat_min: latMin,
--     lon_max: lonMax, lat_max: latMax,
--     max_rows: 500
--   });
-- =============================================================================
