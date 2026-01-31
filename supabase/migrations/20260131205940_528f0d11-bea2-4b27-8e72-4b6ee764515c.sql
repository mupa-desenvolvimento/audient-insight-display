-- Adicionar campos para emoção e conteúdo às detecções
ALTER TABLE public.device_detection_logs 
ADD COLUMN IF NOT EXISTS emotion text,
ADD COLUMN IF NOT EXISTS emotion_confidence real,
ADD COLUMN IF NOT EXISTS content_id uuid REFERENCES public.media_items(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS content_name text,
ADD COLUMN IF NOT EXISTS playlist_id uuid REFERENCES public.playlists(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS age_group text,
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS attention_duration real;

-- Índices para consultas de analytics
CREATE INDEX IF NOT EXISTS idx_detection_logs_detected_at ON public.device_detection_logs(detected_at);
CREATE INDEX IF NOT EXISTS idx_detection_logs_content ON public.device_detection_logs(content_id);
CREATE INDEX IF NOT EXISTS idx_detection_logs_device ON public.device_detection_logs(device_serial);
CREATE INDEX IF NOT EXISTS idx_detection_logs_emotion ON public.device_detection_logs(emotion);