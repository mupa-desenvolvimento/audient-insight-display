-- Drop the restrictive admin-only policy
DROP POLICY IF EXISTS "Admins can manage group channels" ON public.device_group_channels;

-- Create a comprehensive policy for tenant access
CREATE POLICY "Tenant users can manage group channels"
ON public.device_group_channels
FOR ALL
USING (
  public.is_super_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.device_groups dg
    WHERE dg.id = device_group_channels.group_id
    AND dg.tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_mappings 
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.device_groups dg
    WHERE dg.id = device_group_channels.group_id
    AND dg.tenant_id IN (
      SELECT tenant_id FROM public.user_tenant_mappings 
      WHERE user_id = auth.uid()
    )
  )
);
