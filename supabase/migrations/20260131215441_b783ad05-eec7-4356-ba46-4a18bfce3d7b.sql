-- =====================================================
-- MIGRAÇÃO: Canais de Programação dentro de Playlists
-- =====================================================

-- 1. Renomear a tabela channels existente para distribution_channels
ALTER TABLE public.channels RENAME TO distribution_channels;

-- 2. Atualizar foreign keys que referenciam channels
ALTER TABLE public.device_group_channels 
  RENAME COLUMN channel_id TO distribution_channel_id;

ALTER TABLE public.device_group_channels
  DROP CONSTRAINT device_group_channels_channel_id_fkey;

ALTER TABLE public.device_group_channels
  ADD CONSTRAINT device_group_channels_distribution_channel_id_fkey
  FOREIGN KEY (distribution_channel_id) REFERENCES public.distribution_channels(id) ON DELETE CASCADE;

-- 3. Atualizar playlists que referenciam channels
ALTER TABLE public.playlists
  DROP CONSTRAINT IF EXISTS playlists_channel_id_fkey;

ALTER TABLE public.playlists
  ADD CONSTRAINT playlists_distribution_channel_id_fkey
  FOREIGN KEY (channel_id) REFERENCES public.distribution_channels(id) ON DELETE SET NULL;

-- 4. Criar nova tabela playlist_channels (Blocos de Programação)
CREATE TABLE public.playlist_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_time TIME NOT NULL DEFAULT '00:00:00',
  end_time TIME NOT NULL DEFAULT '23:59:59',
  days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  position INTEGER NOT NULL DEFAULT 0,
  is_fallback BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Criar tabela para itens do canal (substitui playlist_items para canais)
CREATE TABLE public.playlist_channel_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.playlist_channels(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  duration_override INTEGER,
  start_date DATE,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  days_of_week INTEGER[],
  is_schedule_override BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Índices para performance
CREATE INDEX idx_playlist_channels_playlist_id ON public.playlist_channels(playlist_id);
CREATE INDEX idx_playlist_channels_time_range ON public.playlist_channels(start_time, end_time);
CREATE INDEX idx_playlist_channel_items_channel_id ON public.playlist_channel_items(channel_id);
CREATE INDEX idx_playlist_channel_items_position ON public.playlist_channel_items(channel_id, position);

-- 7. Habilitar RLS
ALTER TABLE public.playlist_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_channel_items ENABLE ROW LEVEL SECURITY;

-- 8. Políticas RLS para playlist_channels
CREATE POLICY "Admins can manage playlist channels"
ON public.playlist_channels FOR ALL
USING (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()));

CREATE POLICY "Authenticated can read playlist channels"
ON public.playlist_channels FOR SELECT
USING (true);

-- 9. Políticas RLS para playlist_channel_items
CREATE POLICY "Admins can manage playlist channel items"
ON public.playlist_channel_items FOR ALL
USING (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()));

CREATE POLICY "Authenticated can read playlist channel items"
ON public.playlist_channel_items FOR SELECT
USING (true);

-- 10. Trigger para atualizar updated_at
CREATE TRIGGER update_playlist_channels_updated_at
BEFORE UPDATE ON public.playlist_channels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Adicionar flag has_channels na playlist
ALTER TABLE public.playlists 
ADD COLUMN has_channels BOOLEAN NOT NULL DEFAULT false;

-- 12. Migrar playlists existentes com items para ter um canal padrão
-- Primeiro cria os canais padrão para playlists que têm items
INSERT INTO public.playlist_channels (playlist_id, name, description, start_time, end_time, is_fallback, position)
SELECT DISTINCT 
  pi.playlist_id,
  'Principal',
  'Canal padrão migrado automaticamente',
  '00:00:00'::TIME,
  '23:59:59'::TIME,
  true,
  0
FROM public.playlist_items pi
WHERE EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = pi.playlist_id);

-- 13. Migrar os items para os novos canais
INSERT INTO public.playlist_channel_items (
  channel_id, 
  media_id, 
  position, 
  duration_override, 
  start_date, 
  end_date, 
  start_time, 
  end_time, 
  days_of_week, 
  is_schedule_override
)
SELECT 
  pc.id,
  pi.media_id,
  pi.position,
  pi.duration_override,
  pi.start_date,
  pi.end_date,
  pi.start_time,
  pi.end_time,
  pi.days_of_week,
  pi.is_schedule_override
FROM public.playlist_items pi
JOIN public.playlist_channels pc ON pc.playlist_id = pi.playlist_id;

-- 14. Atualizar flag has_channels nas playlists migradas
UPDATE public.playlists 
SET has_channels = true 
WHERE id IN (SELECT DISTINCT playlist_id FROM public.playlist_channels);

-- 15. Habilitar realtime para atualizações
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.playlist_channel_items;