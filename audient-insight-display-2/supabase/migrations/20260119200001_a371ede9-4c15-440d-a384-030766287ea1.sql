-- Drop the existing policy and create a better one
DROP POLICY IF EXISTS "Admins can manage devices" ON public.devices;

-- Create policy for authenticated users who are admins or super admins
CREATE POLICY "Authenticated admins can manage devices" 
ON public.devices 
FOR ALL 
USING (
  public.is_super_admin(auth.uid()) OR 
  public.is_admin(auth.uid()) OR
  public.is_tenant_admin(auth.uid())
)
WITH CHECK (
  public.is_super_admin(auth.uid()) OR 
  public.is_admin(auth.uid()) OR
  public.is_tenant_admin(auth.uid())
);