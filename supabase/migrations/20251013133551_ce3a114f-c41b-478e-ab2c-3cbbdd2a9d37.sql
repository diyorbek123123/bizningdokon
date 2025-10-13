-- Add working hours columns to stores table
ALTER TABLE public.stores ADD COLUMN open_time TIME;
ALTER TABLE public.stores ADD COLUMN close_time TIME;

-- Add latitude and longitude columns to stores table for distance calculations
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);