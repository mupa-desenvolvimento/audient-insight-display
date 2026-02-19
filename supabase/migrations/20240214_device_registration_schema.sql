-- Migration to support Intelligent Device Auto-Registration

-- 1. Update distribution_channels
ALTER TABLE distribution_channels
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS rules jsonb DEFAULT '{}'::jsonb;

-- 2. Update device_groups to have a default channel
ALTER TABLE device_groups
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES distribution_channels(id);

-- 3. Update devices table to support the requested hierarchy and security
ALTER TABLE devices
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id),
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES device_groups(id),
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES distribution_channels(id),
ADD COLUMN IF NOT EXISTS device_token TEXT; -- For secure authentication (JWT or UUID)

-- Add index for device_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_devices_device_token ON devices(device_token);

-- Add unique constraint for device_token if it's meant to be unique
ALTER TABLE devices ADD CONSTRAINT uq_devices_device_token UNIQUE (device_token);

-- 4. Function to generate a secure device token (simple UUID for now, can be upgraded to JWT logic)
CREATE OR REPLACE FUNCTION generate_device_token()
RETURNS TEXT AS $$
BEGIN
  RETURN gen_random_uuid()::text;
END;
$$ LANGUAGE plpgsql;

-- 5. Create media_play_logs table for Proof of Play
CREATE TABLE IF NOT EXISTS media_play_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media_items(id) ON DELETE SET NULL, -- Nullable if media deleted
  played_at TIMESTAMPTZ DEFAULT now(),
  duration INTEGER, -- in seconds
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_media_play_logs_device_id ON media_play_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_media_play_logs_played_at ON media_play_logs(played_at);
