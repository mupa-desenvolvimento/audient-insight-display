
-- Fix #1: Restrict public device UPDATE to only pending devices
DROP POLICY IF EXISTS "Public can update own device during setup" ON public.devices;

CREATE POLICY "Public can update pending device during setup"
ON public.devices FOR UPDATE
USING (status = 'pending')
WITH CHECK (status = 'pending');

-- Fix #2: Remove public read on product_lookup_analytics, restrict to admins
DROP POLICY IF EXISTS "Anyone can read analytics" ON public.product_lookup_analytics;

CREATE POLICY "Admins can read analytics"
ON public.product_lookup_analytics FOR SELECT
USING (
  is_super_admin(auth.uid()) OR 
  is_admin(auth.uid()) OR 
  is_tenant_admin(auth.uid())
);
