-- Function to update device heartbeat securely
CREATE OR REPLACE FUNCTION public.device_heartbeat(p_device_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.devices
  SET 
    last_seen_at = now(),
    status = 'online'
  WHERE device_code = p_device_code;
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.device_heartbeat(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.device_heartbeat(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.device_heartbeat(TEXT) TO service_role;
