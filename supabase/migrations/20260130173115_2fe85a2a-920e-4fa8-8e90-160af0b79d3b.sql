-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage playlists" ON public.playlists;
DROP POLICY IF EXISTS "Authenticated can read playlists" ON public.playlists;

-- Create updated policies that include super_admin and tenant_admin
CREATE POLICY "Admins can manage playlists" ON public.playlists
FOR ALL
USING (
  is_super_admin(auth.uid()) OR 
  is_admin(auth.uid()) OR 
  is_tenant_admin(auth.uid())
)
WITH CHECK (
  is_super_admin(auth.uid()) OR 
  is_admin(auth.uid()) OR 
  is_tenant_admin(auth.uid())
);

CREATE POLICY "Authenticated can read playlists" ON public.playlists
FOR SELECT
USING (true);

-- Also fix playlist_items table policies
DROP POLICY IF EXISTS "Admins can manage playlist items" ON public.playlist_items;
DROP POLICY IF EXISTS "Authenticated can read playlist items" ON public.playlist_items;

CREATE POLICY "Admins can manage playlist items" ON public.playlist_items
FOR ALL
USING (
  is_super_admin(auth.uid()) OR 
  is_admin(auth.uid()) OR 
  is_tenant_admin(auth.uid())
)
WITH CHECK (
  is_super_admin(auth.uid()) OR 
  is_admin(auth.uid()) OR 
  is_tenant_admin(auth.uid())
);

CREATE POLICY "Authenticated can read playlist items" ON public.playlist_items
FOR SELECT
USING (true);