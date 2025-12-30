-- Tabela para registros de detecção de pessoas por dispositivo
CREATE TABLE public.device_detection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES public.devices(id) ON DELETE CASCADE,
  device_serial text NOT NULL,
  device_nickname text,
  face_descriptor jsonb,
  detected_at timestamp with time zone NOT NULL DEFAULT now(),
  confidence real,
  is_facing_camera boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_device_detection_logs_device_id ON public.device_detection_logs(device_id);
CREATE INDEX idx_device_detection_logs_device_serial ON public.device_detection_logs(device_serial);
CREATE INDEX idx_device_detection_logs_detected_at ON public.device_detection_logs(detected_at DESC);

-- Enable RLS
ALTER TABLE public.device_detection_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - dispositivos podem inserir seus próprios registros
CREATE POLICY "Devices can insert detection logs"
ON public.device_detection_logs
FOR INSERT
WITH CHECK (true);

-- Admins podem ler todos os registros
CREATE POLICY "Admins can read all detection logs"
ON public.device_detection_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins podem gerenciar registros
CREATE POLICY "Admins can manage detection logs"
ON public.device_detection_logs
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.device_detection_logs;