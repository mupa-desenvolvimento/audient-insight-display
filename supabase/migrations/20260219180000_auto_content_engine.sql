-- =====================================================
-- AUTO CONTENT ENGINE CORE TABLES
-- =====================================================

-- Table: auto_content_items
-- Stores generated content entries for each automatic content module
CREATE TABLE public.auto_content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type text NOT NULL,
  category text,
  title text NOT NULL,
  description text,
  image_url text,
  payload_json jsonb DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'mock',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.auto_content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can read auto content items"
ON public.auto_content_items
FOR SELECT
USING (
  public.is_super_admin(auth.uid()) OR
  public.can_access_tenant_data(auth.uid(), tenant_id)
);

CREATE POLICY "Tenant admins can manage auto content items"
ON public.auto_content_items
FOR ALL
USING (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
)
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
);

CREATE INDEX idx_auto_content_items_tenant_id ON public.auto_content_items(tenant_id);
CREATE INDEX idx_auto_content_items_type ON public.auto_content_items(type);
CREATE INDEX idx_auto_content_items_status ON public.auto_content_items(status);

CREATE TRIGGER update_auto_content_items_updated_at
BEFORE UPDATE ON public.auto_content_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table: auto_content_settings
-- Per-tenant configuration for each automatic content module
CREATE TABLE public.auto_content_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  refresh_interval_minutes integer NOT NULL DEFAULT 30,
  last_fetch_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, module_type)
);

ALTER TABLE public.auto_content_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can read auto content settings"
ON public.auto_content_settings
FOR SELECT
USING (
  public.is_super_admin(auth.uid()) OR
  public.can_access_tenant_data(auth.uid(), tenant_id)
);

CREATE POLICY "Tenant admins can manage auto content settings"
ON public.auto_content_settings
FOR ALL
USING (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
)
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
);

CREATE INDEX idx_auto_content_settings_tenant_id ON public.auto_content_settings(tenant_id);
CREATE INDEX idx_auto_content_settings_module_type ON public.auto_content_settings(module_type);

CREATE TRIGGER update_auto_content_settings_updated_at
BEFORE UPDATE ON public.auto_content_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table: birthday_uploads
-- Tracks CSV uploads for birthdays per tenant
CREATE TABLE public.birthday_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  processed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.birthday_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can read birthday uploads"
ON public.birthday_uploads
FOR SELECT
USING (
  public.is_super_admin(auth.uid()) OR
  public.can_access_tenant_data(auth.uid(), tenant_id)
);

CREATE POLICY "Tenant admins can manage birthday uploads"
ON public.birthday_uploads
FOR ALL
USING (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
)
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
);

CREATE INDEX idx_birthday_uploads_tenant_id ON public.birthday_uploads(tenant_id);

