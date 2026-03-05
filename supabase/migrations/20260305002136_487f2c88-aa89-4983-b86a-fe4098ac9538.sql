CREATE POLICY "Tenant admins can insert media"
ON public.media_items
FOR INSERT
TO authenticated
WITH CHECK (
  is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid())
);