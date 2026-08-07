-- Hand-written migration (not drizzle-kit generated): TimescaleDB hypertable + PostGIS setup.
-- Run this AFTER the drizzle-kit-generated 0000_*.sql that creates every plain table
-- (companies, users, vehicles, ... and the base `telemetry` table shape).
--
-- Schema rebuild, not a live migration — there is no production data to preserve
-- (confirmed during discovery: dev/pre-launch data only).

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid()

-- Convert the plain `telemetry` table (created by the drizzle-kit migration) into a hypertable.
SELECT create_hypertable('telemetry', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS telemetry_vehicle_time_idx ON telemetry (vehicle_id, time DESC);

-- Replicates the old Mongo time-series collection's 1-year TTL (expireAfterSeconds: 31536000).
SELECT add_retention_policy('telemetry', INTERVAL '1 year', if_not_exists => TRUE);

-- Compression for older chunks — not explicitly requested, but a natural fit given
-- TimescaleDB was chosen deliberately. Flagged for confirmation; safe to drop this
-- block if not wanted, the retention policy above is the one that mirrors old behavior.
ALTER TABLE telemetry SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'vehicle_id'
);
SELECT add_compression_policy('telemetry', INTERVAL '30 days', if_not_exists => TRUE);

-- Spatial index for the geofence processor's ST_Contains lookups (Phase 5).
CREATE INDEX IF NOT EXISTS geofences_geometry_gix ON geofences USING GIST (geometry);
