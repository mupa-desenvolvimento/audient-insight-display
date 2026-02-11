-- Adicionar campos para bloqueio e mídia avulsa em dispositivos
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_message text DEFAULT 'Dispositivo bloqueado pelo administrador',
ADD COLUMN IF NOT EXISTS override_media_id uuid REFERENCES public.media_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS override_media_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS last_sync_requested_at timestamptz;

-- Comentários para documentação
COMMENT ON COLUMN public.devices.is_blocked IS 'Se true, o dispositivo exibe mensagem de bloqueio';
COMMENT ON COLUMN public.devices.blocked_message IS 'Mensagem exibida quando dispositivo está bloqueado';
COMMENT ON COLUMN public.devices.override_media_id IS 'Mídia avulsa que sobrepõe a playlist';
COMMENT ON COLUMN public.devices.override_media_expires_at IS 'Quando a mídia avulsa expira';
COMMENT ON COLUMN public.devices.last_sync_requested_at IS 'Timestamp da última solicitação de sync';