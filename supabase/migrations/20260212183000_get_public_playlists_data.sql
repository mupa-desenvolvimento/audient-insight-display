CREATE OR REPLACE FUNCTION get_public_playlists_data(
  p_playlist_ids uuid[],
  p_channel_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    to_jsonb(p) || jsonb_build_object(
      'playlist_items', COALESCE((
        SELECT jsonb_agg(
          to_jsonb(pi) || jsonb_build_object(
            'media', (
              SELECT jsonb_build_object(
                'id', m.id,
                'name', m.name,
                'type', m.type,
                'file_url', m.file_url,
                'duration', m.duration
              )
              FROM media_items m WHERE m.id = pi.media_id
            )
          ) ORDER BY pi.position
        )
        FROM playlist_items pi
        WHERE pi.playlist_id = p.id
      ), '[]'::jsonb),
      'playlist_channels', COALESCE((
        SELECT jsonb_agg(
          to_jsonb(pc) || jsonb_build_object(
            'playlist_channel_items', COALESCE((
              SELECT jsonb_agg(
                to_jsonb(pci) || jsonb_build_object(
                  'media', (
                    SELECT jsonb_build_object(
                        'id', m.id,
                        'name', m.name,
                        'type', m.type,
                        'file_url', m.file_url,
                        'duration', m.duration
                    )
                    FROM media_items m WHERE m.id = pci.media_id
                  )
                ) ORDER BY pci.position
              )
              FROM playlist_channel_items pci
              WHERE pci.playlist_channel_id = pc.id
            ), '[]'::jsonb)
          ) ORDER BY pc.position
        )
        FROM playlist_channels pc
        WHERE pc.playlist_id = p.id
      ), '[]'::jsonb)
    )
  )
  INTO result
  FROM playlists p
  WHERE p.is_active = true
  AND (
    (p_playlist_ids IS NOT NULL AND p.id = ANY(p_playlist_ids))
    OR 
    (p_channel_ids IS NOT NULL AND p.channel_id = ANY(p_channel_ids))
  )
  ORDER BY p.priority DESC;

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION get_public_playlists_data(uuid[], uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION get_public_playlists_data(uuid[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_playlists_data(uuid[], uuid[]) TO service_role;
