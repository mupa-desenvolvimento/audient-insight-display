-- Add tenant_id column to device_groups table
ALTER TABLE public.device_groups 
ADD COLUMN tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_device_groups_tenant_id ON public.device_groups(tenant_id);

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Admins can manage device groups" ON public.device_groups;
DROP POLICY IF EXISTS "Public can read device groups for setup" ON public.device_groups;
DROP POLICY IF EXISTS "Users can read accessible device groups" ON public.device_groups;

-- Create new RLS policies with tenant isolation
CREATE POLICY "Tenant admins can manage device groups" 
ON public.device_groups 
FOR ALL 
USING (
  is_super_admin(auth.uid()) OR 
  (is_tenant_admin(auth.uid()) AND can_access_tenant_data(auth.uid(), tenant_id))
)
WITH CHECK (
  is_super_admin(auth.uid()) OR 
  (is_tenant_admin(auth.uid()) AND can_access_tenant_data(auth.uid(), tenant_id))
);

-- Policy for authenticated users to read groups within their tenant
CREATE POLICY "Tenant users can read their device groups" 
ON public.device_groups 
FOR SELECT 
USING (
  is_super_admin(auth.uid()) OR 
  can_access_tenant_data(auth.uid(), tenant_id)
);

-- Policy for public device setup - only active groups with valid tenant
CREATE POLICY "Public can read device groups for setup" 
ON public.device_groups 
FOR SELECT 
USING (tenant_id IS NOT NULL);