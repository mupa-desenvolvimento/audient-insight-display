-- Auto Content Engine - Weather module location config
ALTER TABLE public.auto_content_settings
ADD COLUMN IF NOT EXISTS weather_state text,
ADD COLUMN IF NOT EXISTS weather_city text,
ADD COLUMN IF NOT EXISTS weather_country text DEFAULT 'BR';

