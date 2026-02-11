-- Habilitar Realtime para tabelas que ainda não têm
-- Usando IF NOT EXISTS pattern com BEGIN/EXCEPTION
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_items;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_channel_items;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_channels;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;