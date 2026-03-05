
DROP POLICY IF EXISTS "Admins can manage media" ON public.media_items;

CREATE POLICY "Admins can manage media"
ON public.media_items
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()));
