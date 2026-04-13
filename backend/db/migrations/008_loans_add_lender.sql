-- Migration 008: Add lender column to loans table (backfill from missing schema)
ALTER TABLE loans ADD COLUMN IF NOT EXISTS lender TEXT;
