-- Add tenant_id to geographic and store tables for multi-tenant isolation

-- Add tenant_id to countries
ALTER TABLE public.countries ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to regions
ALTER TABLE public.regions ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to states
ALTER TABLE public.states ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to cities
ALTER TABLE public.cities ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Add tenant_id to stores
ALTER TABLE public.stores ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create function to check if user is tenant admin
CREATE OR REPLACE FUNCTION public.is_tenant_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Super admins are always considered tenant admins
  IF public.is_super_admin(check_user_id) THEN
    RETURN true;
  END IF;
  
  -- Check if user is tenant admin in their mapping
  RETURN EXISTS (
    SELECT 1 FROM public.user_tenant_mappings
    WHERE user_id = check_user_id AND is_tenant_admin = true
  );
END;
$$;

-- Create function to get user's tenant_id (non-null version for regular users)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id_strict(check_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tenant_uuid uuid;
BEGIN
  SELECT tenant_id INTO tenant_uuid
  FROM public.user_tenant_mappings
  WHERE user_id = check_user_id
  LIMIT 1;
  
  RETURN tenant_uuid;
END;
$$;

-- Create function to check if user can access data for a specific tenant
CREATE OR REPLACE FUNCTION public.can_access_tenant_data(check_user_id uuid, check_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Super admins can access all tenants
  IF public.is_super_admin(check_user_id) THEN
    RETURN true;
  END IF;
  
  -- Regular users can only access their own tenant
  RETURN EXISTS (
    SELECT 1 FROM public.user_tenant_mappings
    WHERE user_id = check_user_id AND tenant_id = check_tenant_id
  );
END;
$$;

-- Drop existing policies on stores
DROP POLICY IF EXISTS "Admins can manage stores" ON public.stores;
DROP POLICY IF EXISTS "Users can read accessible stores" ON public.stores;

-- Create new tenant-based policies for stores
CREATE POLICY "Tenant users can read their stores"
ON public.stores
FOR SELECT
USING (
  public.is_super_admin(auth.uid()) OR
  public.can_access_tenant_data(auth.uid(), tenant_id)
);

CREATE POLICY "Tenant admins can insert stores"
ON public.stores
FOR INSERT
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
);

CREATE POLICY "Tenant admins can update stores"
ON public.stores
FOR UPDATE
USING (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
)
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
);

CREATE POLICY "Tenant admins can delete stores"
ON public.stores
FOR DELETE
USING (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
);

-- Drop existing policies on countries
DROP POLICY IF EXISTS "Admin global can manage countries" ON public.countries;
DROP POLICY IF EXISTS "Authenticated users can read countries" ON public.countries;

-- Create tenant-based policies for countries
CREATE POLICY "Tenant users can read their countries"
ON public.countries
FOR SELECT
USING (
  public.is_super_admin(auth.uid()) OR
  public.can_access_tenant_data(auth.uid(), tenant_id)
);

CREATE POLICY "Tenant admins can manage countries"
ON public.countries
FOR ALL
USING (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
)
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
);

-- Drop existing policies on regions
DROP POLICY IF EXISTS "Admins can manage regions" ON public.regions;
DROP POLICY IF EXISTS "Authenticated users can read regions" ON public.regions;

-- Create tenant-based policies for regions
CREATE POLICY "Tenant users can read their regions"
ON public.regions
FOR SELECT
USING (
  public.is_super_admin(auth.uid()) OR
  public.can_access_tenant_data(auth.uid(), tenant_id)
);

CREATE POLICY "Tenant admins can manage regions"
ON public.regions
FOR ALL
USING (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
)
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
);

-- Drop existing policies on states
DROP POLICY IF EXISTS "Admins can manage states" ON public.states;
DROP POLICY IF EXISTS "Authenticated users can read states" ON public.states;

-- Create tenant-based policies for states
CREATE POLICY "Tenant users can read their states"
ON public.states
FOR SELECT
USING (
  public.is_super_admin(auth.uid()) OR
  public.can_access_tenant_data(auth.uid(), tenant_id)
);

CREATE POLICY "Tenant admins can manage states"
ON public.states
FOR ALL
USING (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
)
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
);

-- Drop existing policies on cities
DROP POLICY IF EXISTS "Admins can manage cities" ON public.cities;
DROP POLICY IF EXISTS "Authenticated users can read cities" ON public.cities;

-- Create tenant-based policies for cities
CREATE POLICY "Tenant users can read their cities"
ON public.cities
FOR SELECT
USING (
  public.is_super_admin(auth.uid()) OR
  public.can_access_tenant_data(auth.uid(), tenant_id)
);

CREATE POLICY "Tenant admins can manage cities"
ON public.cities
FOR ALL
USING (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
)
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  (public.is_tenant_admin(auth.uid()) AND public.can_access_tenant_data(auth.uid(), tenant_id))
);

-- Create indexes for tenant_id columns for better performance
CREATE INDEX IF NOT EXISTS idx_countries_tenant_id ON public.countries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_regions_tenant_id ON public.regions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_states_tenant_id ON public.states(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cities_tenant_id ON public.cities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stores_tenant_id ON public.stores(tenant_id);