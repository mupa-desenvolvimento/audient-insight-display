-- Migration to support Intelligent Device Auto-Registration via RPC (Security Definer)
-- This avoids RLS issues for unauthenticated devices and encapsulates the logic.

-- 1. Ensure Schema exists (idempotent)
ALTER TABLE distribution_channels
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS rules jsonb DEFAULT '{}'::jsonb;

ALTER TABLE device_groups
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES distribution_channels(id);

ALTER TABLE devices
ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES regions(id),
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES device_groups(id),
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES distribution_channels(id),
ADD COLUMN IF NOT EXISTS device_token TEXT;

CREATE INDEX IF NOT EXISTS idx_devices_device_token ON devices(device_token);
ALTER TABLE devices DROP CONSTRAINT IF EXISTS uq_devices_device_token;
ALTER TABLE devices ADD CONSTRAINT uq_devices_device_token UNIQUE (device_token);

-- Create media_play_logs table if not exists
CREATE TABLE IF NOT EXISTS media_play_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media_items(id) ON DELETE SET NULL,
  played_at TIMESTAMPTZ DEFAULT now(),
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_play_logs_device_id ON media_play_logs(device_id);

-- 2. Create RPC for Device Registration
CREATE OR REPLACE FUNCTION register_device(
  p_device_code TEXT,
  p_name TEXT,
  p_store_id UUID,
  p_company_id UUID,
  p_group_id UUID,
  p_store_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_id UUID;
  v_device_token TEXT;
  v_existing_token TEXT;
BEGIN
  -- 1. Check if device exists
  SELECT id, device_token INTO v_device_id, v_existing_token
  FROM devices
  WHERE device_code = p_device_code;

  -- 2. Generate token if needed
  IF v_existing_token IS NOT NULL THEN
    v_device_token := v_existing_token;
  ELSE
    v_device_token := gen_random_uuid()::text;
  END IF;

  -- 3. Upsert Device
  IF v_device_id IS NOT NULL THEN
    UPDATE devices
    SET
      name = p_name,
      store_id = p_store_id,
      company_id = p_company_id,
      group_id = p_group_id, -- Explicitly update group_id
      status = 'online',
      is_active = true,
      store_code = COALESCE(p_store_code, store_code),
      device_token = v_device_token, -- Ensure token is set
      updated_at = now()
    WHERE id = v_device_id;
  ELSE
    INSERT INTO devices (
      device_code,
      name,
      store_id,
      company_id,
      group_id,
      status,
      is_active,
      store_code,
      device_token
    ) VALUES (
      p_device_code,
      p_name,
      p_store_id,
      p_company_id,
      p_group_id,
      'online',
      true,
      p_store_code,
      v_device_token
    )
    RETURNING id INTO v_device_id;
  END IF;

  -- 4. Link to Group (junction table)
  IF p_group_id IS NOT NULL THEN
    INSERT INTO device_group_members (device_id, group_id)
    VALUES (v_device_id, p_group_id)
    ON CONFLICT (device_id, group_id) DO NOTHING;
  END IF;

  -- 5. Return Result
  RETURN jsonb_build_object(
    'device_id', v_device_id,
    'device_token', v_device_token,
    'message', 'Device registered successfully'
  );
END;
$$;

-- 3. RPC: Heartbeat
CREATE OR REPLACE FUNCTION device_heartbeat(
  p_device_token TEXT,
  p_status TEXT,
  p_current_playlist_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_device_id UUID;
BEGIN
  UPDATE devices
  SET
    last_seen_at = now(),
    status = p_status,
    current_playlist_id = p_current_playlist_id
  WHERE device_token = p_device_token
  RETURNING id INTO v_device_id;

  IF v_device_id IS NULL THEN
    RAISE EXCEPTION 'Invalid device token';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. RPC: Proof of Play
CREATE OR REPLACE FUNCTION register_play_logs(
  p_device_token TEXT,
  p_logs JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_device_id UUID;
  v_log JSONB;
BEGIN
  SELECT id INTO v_device_id FROM devices WHERE device_token = p_device_token;
  IF v_device_id IS NULL THEN
    RAISE EXCEPTION 'Invalid device token';
  END IF;

  -- Iterate and insert logs
  FOR v_log IN SELECT * FROM jsonb_array_elements(p_logs)
  LOOP
    INSERT INTO media_play_logs (device_id, media_id, duration, played_at)
    VALUES (
      v_device_id,
      (v_log->>'media_id')::UUID,
      (v_log->>'duration')::INTEGER,
      (v_log->>'played_at')::TIMESTAMPTZ
    );
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. RPC: Get Device Config
CREATE OR REPLACE FUNCTION get_device_config(p_device_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_device devices%ROWTYPE;
  v_playlist_id UUID;
BEGIN
  SELECT * INTO v_device FROM devices WHERE device_token = p_device_token;
  
  IF v_device.id IS NULL THEN
    RAISE EXCEPTION 'Invalid device token';
  END IF;

  RETURN jsonb_build_object(
    'device', row_to_json(v_device),
    'playlist_id', v_device.current_playlist_id
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION register_device TO anon;
GRANT EXECUTE ON FUNCTION register_device TO authenticated;
GRANT EXECUTE ON FUNCTION register_device TO service_role;

GRANT EXECUTE ON FUNCTION device_heartbeat TO anon;
GRANT EXECUTE ON FUNCTION device_heartbeat TO authenticated;
GRANT EXECUTE ON FUNCTION device_heartbeat TO service_role;

GRANT EXECUTE ON FUNCTION register_play_logs TO anon;
GRANT EXECUTE ON FUNCTION register_play_logs TO authenticated;
GRANT EXECUTE ON FUNCTION register_play_logs TO service_role;

GRANT EXECUTE ON FUNCTION get_device_config TO anon;
GRANT EXECUTE ON FUNCTION get_device_config TO authenticated;
GRANT EXECUTE ON FUNCTION get_device_config TO service_role;
