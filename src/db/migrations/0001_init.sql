-- Phase 1: Benutzer und Login-Bremse.
CREATE TABLE users (
  id                  TEXT PRIMARY KEY,
  email               TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  password_hash       TEXT NOT NULL,
  role                TEXT NOT NULL DEFAULT 'ADMIN',
  totp_secret         TEXT,
  totp_pending_secret TEXT,
  totp_enabled_at     INTEGER,
  totp_last_step      INTEGER,
  totp_recovery       TEXT,
  created_at          INTEGER NOT NULL
);

CREATE TABLE login_throttle (
  key          TEXT PRIMARY KEY,
  failures     INTEGER NOT NULL DEFAULT 0,
  lock_count   INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER,
  updated_at   INTEGER NOT NULL
);
