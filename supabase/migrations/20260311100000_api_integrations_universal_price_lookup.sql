ALTER TABLE public.api_integrations
ADD COLUMN IF NOT EXISTS auth_url text,
ADD COLUMN IF NOT EXISTS auth_method text,
ADD COLUMN IF NOT EXISTS auth_body_json jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS auth_token_path text,
ADD COLUMN IF NOT EXISTS token_expiration_seconds integer,
ADD COLUMN IF NOT EXISTS token_cache jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS token_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS request_url text,
ADD COLUMN IF NOT EXISTS request_method text,
ADD COLUMN IF NOT EXISTS request_headers_json jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS request_params_json jsonb NOT NULL DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS barcode_param_name text,
ADD COLUMN IF NOT EXISTS store_param_name text,
ADD COLUMN IF NOT EXISTS response_mapping_json jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'api_integrations'
      AND constraint_name = 'api_integrations_auth_method_chk'
  ) THEN
    ALTER TABLE public.api_integrations
    ADD CONSTRAINT api_integrations_auth_method_chk
    CHECK (auth_method IS NULL OR upper(auth_method) IN ('GET', 'POST'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'api_integrations'
      AND constraint_name = 'api_integrations_request_method_chk'
  ) THEN
    ALTER TABLE public.api_integrations
    ADD CONSTRAINT api_integrations_request_method_chk
    CHECK (request_method IS NULL OR upper(request_method) IN ('GET', 'POST'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_api_integrations_updated_at ON public.api_integrations;
CREATE TRIGGER update_api_integrations_updated_at
BEFORE UPDATE ON public.api_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
