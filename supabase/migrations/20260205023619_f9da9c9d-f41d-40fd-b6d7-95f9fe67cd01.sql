-- Add policy to allow authenticated users to update media items folder_id
CREATE POLICY "Authenticated users can move media to folders"
ON public.media_items
FOR UPDATE
USING (true)
WITH CHECK (true);