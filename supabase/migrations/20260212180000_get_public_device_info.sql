-- Função para permitir que dispositivos acessem suas configurações sem expor a tabela devices publicamente
CREATE OR REPLACE FUNCTION get_public_device_info(p_device_code text)
RETURNS TABLE (
  id uuid,
  name text,
  store_id uuid,
  current_playlist_id uuid,
  company_id uuid,
  is_blocked boolean,
  blocked_message text,
  camera_enabled boolean,
  override_media_id uuid,
  override_media_expires_at timestamptz,
  last_sync_requested_at timestamptz,
  store_code text,
  company_slug text,
  override_media_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    d.store_id,
    d.current_playlist_id,
    d.company_id,
    d.is_blocked,
    d.blocked_message,
    d.camera_enabled,
    d.override_media_id,
    d.override_media_expires_at,
    d.last_sync_requested_at,
    d.store_code,
    c.slug as company_slug,
    (
      SELECT jsonb_build_object(
        'id', m.id,
        'name', m.name,
        'type', m.type,
        'file_url', m.file_url,
        'duration', m.duration
      )
      FROM media_items m
      WHERE m.id = d.override_media_id
    ) as override_media_data
  FROM devices d
  LEFT JOIN companies c ON c.id = d.company_id
  WHERE d.device_code = p_device_code;
END;
$$;

-- Permite acesso público à função
GRANT EXECUTE ON FUNCTION get_public_device_info(text) TO anon;
GRANT EXECUTE ON FUNCTION get_public_device_info(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_device_info(text) TO service_role;
