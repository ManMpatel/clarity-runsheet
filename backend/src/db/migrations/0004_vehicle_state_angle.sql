-- Live map heading. Teltonika AVL angle (0–360, 0 = north) was already on the
-- telemetry hypertable and the van:update socket payload, but vehicle_state
-- (the /telemetry/live snapshot) never stored it, so markers had no heading
-- until the next socket ping — and even then MapScreen dropped the field.
ALTER TABLE "vehicle_state" ADD COLUMN "angle" smallint;
