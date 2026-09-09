-- Migration: Add dual wallet system (income + working wallets)
-- Run this SQL on the production database

-- Add new columns
ALTER TABLE wallet ADD COLUMN income_balance integer DEFAULT 0 NOT NULL;
ALTER TABLE wallet ADD COLUMN working_balance integer DEFAULT 0 NOT NULL;

-- Migrate existing balance data: all existing balance goes to income balance
-- (since most existing income is matching income which belongs in income wallet)
UPDATE wallet SET income_balance = balance;

-- Drop old balance column
ALTER TABLE wallet DROP COLUMN balance;
