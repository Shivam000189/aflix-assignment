-- Migration: 20261023000000_normalize_roles_to_user
-- Standardizes application roles to ('admin', 'manager', 'user') with default 'user'
-- Converts legacy 'sales_rep' accounts safely without losing account IDs or relationships

-- Step 1: Data Migration - Normalize existing legacy roles to 'user'
UPDATE "users"
SET "role" = 'user'
WHERE "role" = 'sales_rep' OR "role" NOT IN ('admin', 'manager', 'user');

-- Step 2: Schema Migration - Update the default role on the users table to 'user'
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';

-- Step 3: Schema Migration - Enforce role constraint at the PostgreSQL database level
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("role" IN ('admin', 'manager', 'user'));
    END IF;
END $$;
