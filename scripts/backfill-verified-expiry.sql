-- Backfill verified_expiry for all existing admin_verified incidents
-- that have no expiry or an already-expired one.
-- Sets them to 48 hours from NOW() so they immediately appear on the map.

UPDATE incidents
SET verified_expiry = NOW() + INTERVAL '48 hours'
WHERE admin_verified = TRUE
  AND (verified_expiry IS NULL OR verified_expiry < NOW());
