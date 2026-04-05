-- Add neighbourhood column to user_profiles if it does not already exist.
-- This stores the user's detected neighbourhood/suburb from browser geolocation
-- for use in cost-of-living scraping and budget generation.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'neighbourhood'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN neighbourhood TEXT;
  END IF;
END
$$;
