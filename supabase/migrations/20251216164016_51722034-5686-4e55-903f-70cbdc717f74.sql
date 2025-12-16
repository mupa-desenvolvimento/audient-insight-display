-- =====================================================
-- MULTI-TENANT SCHEMA-PER-TENANT INFRASTRUCTURE
-- =====================================================

-- 1. Tenants table (global registry of all tenants)
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  schema_name text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  -- Settings
  max_users integer DEFAULT 50,
  max_devices integer DEFAULT 100,
  max_stores integer DEFAULT 500,
  -- Status
  last_migration_at timestamp with time zone,
  migration_version integer DEFAULT 0
);

-- 2. User-Tenant mapping (which users belong to which tenant)
CREATE TABLE IF NOT EXISTS public.user_tenant_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  is_tenant_admin boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- 3. Tenant admin logs (audit trail)
CREATE TABLE IF NOT EXISTS public.tenant_admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id),
  actor_email text,
  action text NOT NULL,
  tenant_id uuid REFERENCES public.tenants(id),
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Super Admin check function (HARDCODED)
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = check_user_id;
  
  -- Hardcoded super admin emails
  RETURN user_email IN ('antunes@mupa.app', 'support@mupa.app');
END;
$$;

-- 5. Get user's tenant function
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(check_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tenant_uuid uuid;
BEGIN
  -- Super admins have special handling (they can switch tenants)
  IF public.is_super_admin(check_user_id) THEN
    -- For super admins, check if they have a session-set tenant
    -- This will be managed via app context, return null to indicate "global access"
    RETURN NULL;
  END IF;
  
  -- For regular users, get their assigned tenant
  SELECT tenant_id INTO tenant_uuid
  FROM public.user_tenant_mappings
  WHERE user_id = check_user_id
  LIMIT 1;
  
  RETURN tenant_uuid;
END;
$$;

-- 6. Check if user has access to specific tenant
CREATE OR REPLACE FUNCTION public.has_tenant_access(check_user_id uuid, check_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admins have access to all tenants
  IF public.is_super_admin(check_user_id) THEN
    RETURN true;
  END IF;
  
  -- Check user-tenant mapping
  RETURN EXISTS (
    SELECT 1 FROM public.user_tenant_mappings
    WHERE user_id = check_user_id AND tenant_id = check_tenant_id
  );
END;
$$;

-- 7. Enable RLS on new tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenant_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_admin_logs ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for tenants table
CREATE POLICY "Super admins can manage all tenants"
ON public.tenants FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can read own tenant"
ON public.tenants FOR SELECT
USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.user_tenant_mappings
    WHERE user_id = auth.uid() AND tenant_id = tenants.id
  )
);

-- 9. RLS Policies for user_tenant_mappings
CREATE POLICY "Super admins can manage all mappings"
ON public.user_tenant_mappings FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can read own mapping"
ON public.user_tenant_mappings FOR SELECT
USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

-- 10. RLS Policies for tenant_admin_logs
CREATE POLICY "Super admins can manage logs"
ON public.tenant_admin_logs FOR ALL
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- 11. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_tenant_mappings_user_id ON public.user_tenant_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenant_mappings_tenant_id ON public.user_tenant_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON public.tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_schema_name ON public.tenants(schema_name);
CREATE INDEX IF NOT EXISTS idx_tenant_admin_logs_tenant_id ON public.tenant_admin_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_admin_logs_created_at ON public.tenant_admin_logs(created_at DESC);

-- 12. Trigger for updated_at
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();