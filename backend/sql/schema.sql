-- =========================================================================
-- SAFE SOLUTIONS SMART ATTENDANCE SYSTEM - SCHEMA
-- PostgreSQL 13+
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------
-- ENUM TYPES
-- ------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('Employee', 'Manager', 'Controller', 'Boss');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE employee_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_type AS ENUM ('office', 'site');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'leave');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ------------------------------------------------------------------------
-- EMPLOYEES
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(150) NOT NULL,
  role          user_role NOT NULL DEFAULT 'Employee',
  image         VARCHAR(255) DEFAULT 'logo.jpeg',
  designation   VARCHAR(150) DEFAULT '',
  department    VARCHAR(150) DEFAULT '',
  email         VARCHAR(150) DEFAULT '',
  phone         VARCHAR(30)  DEFAULT '',
  code          VARCHAR(30)  UNIQUE,
  join_date     DATE DEFAULT CURRENT_DATE,
  status        employee_status NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------
-- USERS  (login credentials, 1:1 with employees)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id          UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  username             VARCHAR(50) NOT NULL UNIQUE,
  password_hash        VARCHAR(255) NOT NULL,
  role                 user_role NOT NULL DEFAULT 'Employee',
  first_login          BOOLEAN NOT NULL DEFAULT TRUE,
  reset_token          VARCHAR(255),
  reset_token_expires  TIMESTAMPTZ,
  refresh_token        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ------------------------------------------------------------------------
-- ATTENDANCE
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name    VARCHAR(150) NOT NULL,
  type             attendance_type NOT NULL,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in         TIME,
  check_out        TIME,
  site             VARCHAR(150),
  latitude         DOUBLE PRECISION,
  longitude        DOUBLE PRECISION,
  gps_accuracy     DOUBLE PRECISION,
  within_geofence  BOOLEAN,
  selfie_path      VARCHAR(255),
  site_photo_path  VARCHAR(255),
  status           attendance_status NOT NULL DEFAULT 'present',
  approval_status  approval_status NOT NULL DEFAULT 'pending',
  approved_by      UUID REFERENCES users(id),
  notes            TEXT DEFAULT '',
  qr_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_employee   ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date       ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status     ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_approval   ON attendance(approval_status);

-- ------------------------------------------------------------------------
-- NOTIFICATIONS
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,  -- NULL = broadcast
  message     TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- ------------------------------------------------------------------------
-- SETTINGS  (single row)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id                    SMALLINT PRIMARY KEY DEFAULT 1,
  office_lat            DOUBLE PRECISION DEFAULT 31.5497,
  office_lng            DOUBLE PRECISION DEFAULT 74.3436,
  office_radius_meters  INTEGER DEFAULT 500,
  office_start_time     TIME DEFAULT '09:00',
  office_end_time       TIME DEFAULT '17:00',
  late_grace_minutes    INTEGER DEFAULT 15,
  dark_mode             BOOLEAN DEFAULT TRUE,
  email_notif           BOOLEAN DEFAULT TRUE,
  push_notif            BOOLEAN DEFAULT TRUE,
  CONSTRAINT single_row CHECK (id = 1)
);

-- ------------------------------------------------------------------------
-- SITE LOCATIONS
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sites (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(150) NOT NULL UNIQUE,
  latitude      DOUBLE PRECISION,
  longitude     DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 500,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------
-- OFFICE QR CODE  (exactly ONE permanent row, id = 1)
-- Value is fixed: SAFE-SOLUTIONS-HQ-001
-- Only the rendered PNG image can be regenerated.
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS office_qr (
  id              SMALLINT PRIMARY KEY DEFAULT 1,
  code            VARCHAR(100) NOT NULL,
  image_base64    TEXT NOT NULL,
  regenerated_by  UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT single_office_qr CHECK (id = 1)
);

-- ------------------------------------------------------------------------
-- AUDIT LOG
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id),
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(50)  NOT NULL,
  entity_id     UUID,
  details       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------
-- updated_at auto-touch trigger
-- ------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_employees_updated ON employees;
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_attendance_updated ON attendance;
CREATE TRIGGER trg_attendance_updated BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_office_qr_updated ON office_qr;
CREATE TRIGGER trg_office_qr_updated BEFORE UPDATE ON office_qr
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();