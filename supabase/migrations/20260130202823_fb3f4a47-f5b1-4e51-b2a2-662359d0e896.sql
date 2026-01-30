-- Adicionar coluna para configuração de escala do conteúdo
ALTER TABLE public.playlists 
ADD COLUMN IF NOT EXISTS content_scale text DEFAULT 'cover' CHECK (content_scale IN ('cover', 'contain', 'fill'));