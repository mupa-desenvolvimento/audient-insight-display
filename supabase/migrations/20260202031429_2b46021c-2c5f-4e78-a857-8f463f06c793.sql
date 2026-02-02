-- Add start_date and end_date columns to playlist_channels
ALTER TABLE public.playlist_channels
ADD COLUMN IF NOT EXISTS start_date date DEFAULT NULL,
ADD COLUMN IF NOT EXISTS end_date date DEFAULT NULL;