-- Add thumbnail_url column to media_items table
ALTER TABLE public.media_items 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.media_items.thumbnail_url IS 'URL of the generated thumbnail (1280x720 JPEG)';

-- Update the metadata column to store additional validation info
COMMENT ON COLUMN public.media_items.metadata IS 'JSON metadata including r2_key, content_type, uploaded_by, thumbnail_generated, validated_at';