-- Add new columns to stores table for enhanced features
ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_open BOOLEAN DEFAULT true;

-- Create categories enum (without IF NOT EXISTS - check manually instead)
DO $$ BEGIN
  CREATE TYPE store_category AS ENUM (
    'grocery',
    'electronics',
    'clothing',
    'restaurant',
    'pharmacy',
    'hardware',
    'bookstore',
    'sports',
    'beauty',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.stores 
  ALTER COLUMN category TYPE store_category USING category::store_category;

-- Create favorites table
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, store_id)
);

-- Enable RLS on favorites
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Favorites policies
CREATE POLICY "Users can view their own favorites"
  ON public.user_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorites"
  ON public.user_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorites"
  ON public.user_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(store_id, user_id)
);

-- Enable RLS on reviews
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

-- Reviews policies
CREATE POLICY "Everyone can view reviews"
  ON public.store_reviews
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON public.store_reviews
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
  ON public.store_reviews
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.store_reviews
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update store rating
CREATE OR REPLACE FUNCTION update_store_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.stores
  SET 
    rating = (
      SELECT AVG(rating)::NUMERIC(3,2)
      FROM public.store_reviews
      WHERE store_id = COALESCE(NEW.store_id, OLD.store_id)
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.store_reviews
      WHERE store_id = COALESCE(NEW.store_id, OLD.store_id)
    )
  WHERE id = COALESCE(NEW.store_id, OLD.store_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_store_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON public.store_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_store_rating();

-- Add product categories
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category TEXT;

DO $$ BEGIN
  CREATE TYPE product_category AS ENUM (
    'food',
    'electronics',
    'clothing',
    'health',
    'home',
    'sports',
    'books',
    'toys',
    'beauty',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.products
  ALTER COLUMN category TYPE product_category USING category::product_category;