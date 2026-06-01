-- ═══════════════════════════════════════════════════════════════════════════
--  AlphaView TV — Database Initialisation Script
--  Run automatically by docker-compose on first startup via init.d mount
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";         -- GIN index support

-- ─── ENUMS ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role       AS ENUM ('user', 'producer', 'admin');
  CREATE TYPE content_status  AS ENUM ('draft', 'processing', 'review', 'live', 'rejected');
  CREATE TYPE content_type    AS ENUM ('movie', 'series', 'documentary', 'short');
  CREATE TYPE purchase_status AS ENUM ('pending', 'active', 'expired', 'refunded');
  CREATE TYPE payout_status   AS ENUM ('pending', 'approved', 'processing', 'paid', 'failed', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─── USERS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name       VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  phone           VARCHAR(20)  UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  role            user_role    DEFAULT 'user',
  is_verified     BOOLEAN      DEFAULT false,
  is_banned       BOOLEAN      DEFAULT false,
  avatar_url      TEXT,
  device_tokens   TEXT[]       DEFAULT '{}',
  purchase_count  INTEGER      DEFAULT 0,
  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone  ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);

-- ─── PRODUCERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS producers (
  id                      UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  studio_name             VARCHAR(255) NOT NULL,
  bio                     TEXT,
  banner_url              TEXT,
  avatar_url              TEXT,
  bank_account_no         TEXT,                    -- AES-256 encrypted
  bank_code               VARCHAR(10),
  bank_name               VARCHAR(100),
  bank_account_last4      VARCHAR(4),
  paystack_recipient_code VARCHAR(60),
  commission_rate         DECIMAL(5,2) DEFAULT 20.00,
  earnings_balance        BIGINT       DEFAULT 0,  -- kobo
  total_earned            BIGINT       DEFAULT 0,  -- kobo
  follower_count          INTEGER      DEFAULT 0,
  content_count           INTEGER      DEFAULT 0,
  avg_rating              DECIMAL(3,2) DEFAULT 0,
  is_verified             BOOLEAN      DEFAULT false,
  is_suspended            BOOLEAN      DEFAULT false,
  created_at              TIMESTAMPTZ  DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_producers_user_id     ON producers(user_id);
CREATE INDEX IF NOT EXISTS idx_producers_is_verified ON producers(is_verified);

-- ─── CONTENT ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS content (
  id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  producer_id     UUID           NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  title           VARCHAR(255)   NOT NULL,
  description     TEXT,
  genre           TEXT[]         DEFAULT '{}',
  type            content_type   DEFAULT 'movie',
  price_kobo      BIGINT         NOT NULL,
  hls_key         TEXT,
  thumbnail_key   TEXT,
  trailer_key     TEXT,
  status          content_status DEFAULT 'draft',
  duration_mins   INTEGER,
  age_rating      VARCHAR(10)    DEFAULT 'PG',
  cast_list       TEXT[]         DEFAULT '{}',
  release_date    DATE,
  view_count      BIGINT         DEFAULT 0,
  purchase_count  INTEGER        DEFAULT 0,
  avg_rating      DECIMAL(3,2)   DEFAULT 0,
  rejection_reason TEXT,
  approved_by     UUID,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ    DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_producer   ON content(producer_id);
CREATE INDEX IF NOT EXISTS idx_content_status     ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_type       ON content(type);
CREATE INDEX IF NOT EXISTS idx_content_genre      ON content USING GIN(genre);
CREATE INDEX IF NOT EXISTS idx_content_title_trgm ON content USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_content_view_count ON content(view_count DESC);

-- ─── PURCHASES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id             UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id     UUID           NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  amount_kobo    BIGINT         NOT NULL,
  paystack_ref   VARCHAR(100)   UNIQUE,
  status         purchase_status DEFAULT 'pending',
  payment_method VARCHAR(30),
  purchased_at   TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ    DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_user_id   ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_content_id ON purchases(content_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status     ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_expiry     ON purchases(expires_at) WHERE status = 'active';

-- ─── PAYOUT REQUESTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payout_requests (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  producer_id       UUID          NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  amount_kobo       BIGINT        NOT NULL,
  status            payout_status DEFAULT 'pending',
  rejection_reason  TEXT,
  transfer_ref      VARCHAR(80),
  approved_by       UUID,
  paid_at           TIMESTAMPTZ,
  requested_at      TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payouts_producer ON payout_requests(producer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status   ON payout_requests(status);

-- ─── DOWNLOADS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS downloads (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id         UUID        NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  device_id           VARCHAR(64) NOT NULL,
  encryption_key_id   VARCHAR(100) NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  key_revoked         BOOLEAN     DEFAULT false,
  downloaded_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(purchase_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_downloads_purchase ON downloads(purchase_id);

-- ─── FOLLOWERS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS followers (
  user_id     UUID NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  producer_id UUID NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, producer_id)
);

CREATE INDEX IF NOT EXISTS idx_followers_producer ON followers(producer_id);

-- ─── CONTENT DAILY STATS (pre-aggregated for fast dashboard queries) ──────────
CREATE TABLE IF NOT EXISTS content_daily_stats (
  date         DATE NOT NULL,
  content_id   UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  producer_id  UUID NOT NULL,
  purchases    INTEGER DEFAULT 0,
  revenue_kobo BIGINT  DEFAULT 0,
  PRIMARY KEY (date, content_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_producer ON content_daily_stats(producer_id, date DESC);

-- ─── UPDATED_AT trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER users_updated_at     BEFORE UPDATE ON users     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER producers_updated_at BEFORE UPDATE ON producers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER content_updated_at   BEFORE UPDATE ON content   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ─── SEED: Default admin user (change password immediately!) ─────────────────
-- Password: Admin@AlphaView2024 (bcrypt hash below)
INSERT INTO users (full_name, email, password_hash, role, is_verified)
VALUES (
  'AlphaView Admin',
  'admin@alphaview.tv',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewFU.asCFj5RZmRa',
  'admin',
  true
) ON CONFLICT (email) DO NOTHING;

RAISE NOTICE 'AlphaView TV database initialised successfully ✓';
