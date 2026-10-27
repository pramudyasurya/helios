-- Additive migration: nullable JSON column (expand-only, zero-downtime)
-- Stores a Playwright storageState blob (cookies + localStorage origins) per environment

ALTER TABLE "Environment" ADD COLUMN "storageState" JSONB;
