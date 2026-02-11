-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage playlists" ON public.playlists;
DROP POLICY IF EXISTS "Authenticated can read playlists" ON public.playlists;

-- Create permissive policies
CREATE POLICY "Admins can manage playlists" 
ON public.playlists 
FOR ALL 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated can read playlists" 
ON public.playlists 
FOR SELECT 
USING (true);