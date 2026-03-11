DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'devices'
      AND column_name = 'api_integration_id'
  ) THEN
    ALTER TABLE public.devices
      ADD COLUMN api_integration_id UUID REFERENCES public.api_integrations(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_devices_api_integration_id ON public.devices(api_integration_id);
