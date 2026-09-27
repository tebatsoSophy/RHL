
-- ============================================================
-- RehabLedger
-- Merge existing database with teammate's database structure
-- ============================================================
--
-- IMPORTANT:
-- This migration is designed to PRESERVE existing data.
--
-- It does NOT:
--   - drop the database
--   - drop existing users
--   - drop existing mines
--   - drop existing zones
--   - change MINE to WORKER
--
-- ============================================================


BEGIN;


-- ============================================================
-- 1. CREATE COMPANIES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,

    name VARCHAR(150) NOT NULL,

    registration_number VARCHAR(100)
        UNIQUE,

    company_type VARCHAR(100),

    created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================
-- 2. ADD company_id TO USERS
-- ============================================================

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS company_id INTEGER;


-- Add foreign key only if it does not already exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_company_id_fkey'
    ) THEN

        ALTER TABLE users
            ADD CONSTRAINT users_company_id_fkey
            FOREIGN KEY (company_id)
            REFERENCES companies(id)
            ON DELETE SET NULL;

    END IF;
END
$$;


-- ============================================================
-- 3. ADD ZONE ASSIGNMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS zone_assignments (

    id SERIAL PRIMARY KEY,

    user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    zone_id INTEGER NOT NULL
        REFERENCES rehabilitation_zones(id)
        ON DELETE CASCADE,

    assigned_by INTEGER
        REFERENCES users(id)
        ON DELETE SET NULL,

    status VARCHAR(50)
        NOT NULL DEFAULT 'ACTIVE',

    assigned_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_zone
        UNIQUE (user_id, zone_id),

    CONSTRAINT valid_assignment_status
        CHECK (
            status IN (
                'ACTIVE',
                'REMOVED'
            )
        )
);


-- ============================================================
-- 4. MODIFY INVITATIONS TABLE
-- ============================================================
--
-- Current:
--
-- id
-- name
-- email
-- role
-- mine_id
-- invitation_token
-- otp_hash
-- token_expires_at
-- status
-- created_at
-- completed_at
--
-- Target additions/renames:
--
-- id
-- name                 (kept temporarily)
-- email
-- role
-- mine_id
-- company_id
-- zone_id
-- invited_by
-- invitation_token_hash
-- otp_hash
-- expires_at
-- status
-- accepted_at
-- accepted_user_id
-- created_at
--
-- ============================================================


-- Rename invitation_token
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'invitations'
        AND column_name = 'invitation_token'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'invitations'
        AND column_name = 'invitation_token_hash'
    ) THEN

        ALTER TABLE invitations
            RENAME COLUMN invitation_token
            TO invitation_token_hash;

    END IF;
END
$$;


-- Rename token_expires_at
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'invitations'
        AND column_name = 'token_expires_at'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'invitations'
        AND column_name = 'expires_at'
    ) THEN

        ALTER TABLE invitations
            RENAME COLUMN token_expires_at
            TO expires_at;

    END IF;
END
$$;


-- Rename completed_at
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'invitations'
        AND column_name = 'completed_at'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'invitations'
        AND column_name = 'accepted_at'
    ) THEN

        ALTER TABLE invitations
            RENAME COLUMN completed_at
            TO accepted_at;

    END IF;
END
$$;


-- ============================================================
-- 5. ADD COMPANY_ID TO INVITATIONS
-- ============================================================

ALTER TABLE invitations
    ADD COLUMN IF NOT EXISTS company_id INTEGER;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'invitations_company_id_fkey'
    ) THEN

        ALTER TABLE invitations
            ADD CONSTRAINT invitations_company_id_fkey
            FOREIGN KEY (company_id)
            REFERENCES companies(id)
            ON DELETE SET NULL;

    END IF;
END
$$;


-- ============================================================
-- 6. ADD ZONE_ID TO INVITATIONS
-- ============================================================

ALTER TABLE invitations
    ADD COLUMN IF NOT EXISTS zone_id INTEGER;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'invitations_zone_id_fkey'
    ) THEN

        ALTER TABLE invitations
            ADD CONSTRAINT invitations_zone_id_fkey
            FOREIGN KEY (zone_id)
            REFERENCES rehabilitation_zones(id)
            ON DELETE CASCADE;

    END IF;
END
$$;


-- ============================================================
-- 7. ADD INVITED_BY TO INVITATIONS
-- ============================================================

ALTER TABLE invitations
    ADD COLUMN IF NOT EXISTS invited_by INTEGER;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'invitations_invited_by_fkey'
    ) THEN

        ALTER TABLE invitations
            ADD CONSTRAINT invitations_invited_by_fkey
            FOREIGN KEY (invited_by)
            REFERENCES users(id)
            ON DELETE SET NULL;

    END IF;
END
$$;


-- ============================================================
-- 8. ADD ACCEPTED_USER_ID TO INVITATIONS
-- ============================================================

ALTER TABLE invitations
    ADD COLUMN IF NOT EXISTS accepted_user_id INTEGER;


DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'invitations_accepted_user_id_fkey'
    ) THEN

        ALTER TABLE invitations
            ADD CONSTRAINT invitations_accepted_user_id_fkey
            FOREIGN KEY (accepted_user_id)
            REFERENCES users(id)
            ON DELETE SET NULL;

    END IF;
END
$$;


-- ============================================================
-- 9. DO NOT REMOVE name YET
-- ============================================================
--
-- Your current invitation already contains:
--
-- John Smith
--
-- We keep name so existing invitation data is not lost.
--
-- Later, once your teammate's invitation controller is fully
-- merged and no longer needs the name column, we can remove it.
--
-- ============================================================


-- ============================================================
-- 10. UPDATE EXISTING INVITATIONS
-- ============================================================
--
-- Existing invitations may not have zone/company/invited_by.
-- Therefore they remain NULL.
--
-- This is intentional so existing data remains valid.
--
-- ============================================================


-- ============================================================
-- 11. SHOW FINAL INVITATIONS STRUCTURE
-- ============================================================

COMMIT;


-- ============================================================
-- VERIFICATION
-- ============================================================

\d companies

\d users

\d invitations

\d zone_assignments


-- ============================================================
-- SHOW ALL TABLES
-- ============================================================

\dt
