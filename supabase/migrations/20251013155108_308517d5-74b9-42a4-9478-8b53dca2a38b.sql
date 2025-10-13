-- Add store_owner role to enum (must be in separate transaction)
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'store_owner';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;