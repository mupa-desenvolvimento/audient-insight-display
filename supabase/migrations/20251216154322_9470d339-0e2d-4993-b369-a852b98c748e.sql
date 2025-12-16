-- Adicionar campos de programação na tabela playlists
ALTER TABLE public.playlists 
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS days_of_week integer[] DEFAULT '{0,1,2,3,4,5,6}'::integer[],
ADD COLUMN IF NOT EXISTS start_time time DEFAULT '00:00:00',
ADD COLUMN IF NOT EXISTS end_time time DEFAULT '23:59:59',
ADD COLUMN IF NOT EXISTS priority integer DEFAULT 5,
ADD COLUMN IF NOT EXISTS fallback_media_id uuid REFERENCES public.media_items(id) ON DELETE SET NULL;

-- Adicionar fallback_playlist_id nos canais
ALTER TABLE public.channels
ADD COLUMN IF NOT EXISTS fallback_playlist_id uuid REFERENCES public.playlists(id) ON DELETE SET NULL;

-- Adicionar screen_type nos grupos de dispositivos
ALTER TABLE public.device_groups
ADD COLUMN IF NOT EXISTS screen_type text DEFAULT 'tv';

-- Criar tabela de atribuição de canais aos grupos (com ordem)
CREATE TABLE IF NOT EXISTS public.device_group_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.device_groups(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, channel_id)
);

-- Habilitar RLS
ALTER TABLE public.device_group_channels ENABLE ROW LEVEL SECURITY;

-- Policies para device_group_channels
CREATE POLICY "Admins can manage group channels" ON public.device_group_channels
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated can read group channels" ON public.device_group_channels
  FOR SELECT USING (true);

-- Trigger para updated_at em playlists (se não existir)
DROP TRIGGER IF EXISTS update_playlists_updated_at ON public.playlists;
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em channels (se não existir)
DROP TRIGGER IF EXISTS update_channels_updated_at ON public.channels;
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();