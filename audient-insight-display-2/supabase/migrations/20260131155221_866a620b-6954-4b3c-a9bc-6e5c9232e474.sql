-- Add individual scheduling columns to playlist_items
ALTER TABLE public.playlist_items 
  ADD COLUMN IF NOT EXISTS start_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS end_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS start_time time DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS end_time time DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS days_of_week integer[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_schedule_override boolean DEFAULT false;

-- Add comment explaining the columns
COMMENT ON COLUMN public.playlist_items.is_schedule_override IS 'When true, item uses its own schedule instead of playlist schedule';
COMMENT ON COLUMN public.playlist_items.start_date IS 'Individual item start date (overrides playlist)';
COMMENT ON COLUMN public.playlist_items.end_date IS 'Individual item end date (overrides playlist)';
COMMENT ON COLUMN public.playlist_items.start_time IS 'Individual item start time (overrides playlist)';
COMMENT ON COLUMN public.playlist_items.end_time IS 'Individual item end time (overrides playlist)';
COMMENT ON COLUMN public.playlist_items.days_of_week IS 'Individual item days of week (overrides playlist)';