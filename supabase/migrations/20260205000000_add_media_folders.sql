-- Create folders table
CREATE TABLE IF NOT EXISTS public.folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid()
);

-- Add folder_id to media_items
ALTER TABLE public.media_items 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- Policy for folders
CREATE POLICY "Users can view their own folders" 
ON public.folders FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own folders" 
ON public.folders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" 
ON public.folders FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" 
ON public.folders FOR DELETE 
USING (auth.uid() = user_id);
