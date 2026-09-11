-- Migration: Add repurchase + cashback wallets, zero all balances
-- Run: node scripts/run-migration.cjs scripts/migrate-wallets.sql

-- 1. Add new columns (idempotent)
ALTER TABLE wallet ADD COLUMN IF NOT EXISTS repurchase_balance INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE wallet ADD COLUMN IF NOT EXISTS cashback_balance INTEGER DEFAULT 0 NOT NULL;

-- 2. Zero out ALL wallet balances (fresh start)
UPDATE wallet SET
  income_balance = 0,
  working_balance = 0,
  repurchase_balance = 0,
  cashback_balance = 0,
  total_earned = 0;

-- 3. Add 'cashback' to income type enum (PostgreSQL requires recreation)
-- Only needed if the enum type exists; otherwise the text column accepts it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'income_type_enum') THEN
    ALTER TYPE income_type_enum ADD VALUE IF NOT EXISTS 'cashback';
  END IF;
END $$;

-- Done. All wallets zeroed, new columns added.
