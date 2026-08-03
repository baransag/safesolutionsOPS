-- =========================================================================
-- SEED DATA
-- Static lookup data only (settings row + default sites).
-- Employee + user records are inserted via src/config/seed.js (Node)
-- because bcrypt hashing must happen in JavaScript, not in raw SQL.
-- =========================================================================

INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

INSERT INTO sites (name, latitude, longitude, radius_meters) VALUES
  ('Main Construction Site', 31.5204, 74.3587, 500),
  ('Warehouse North',        31.5820, 74.3294, 300),
  ('Client Site - DHA',      31.4697, 74.4137, 300)
ON CONFLICT (name) DO NOTHING;