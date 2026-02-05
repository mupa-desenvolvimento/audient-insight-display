-- Create table to track external editor sessions (Canva, future editors)
CREATE TABLE public.external_editor_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'canva', -- 'canva', 'figma', etc.
  provider_design_id text, -- ID do design no provider
  session_type text NOT NULL DEFAULT 'create', -- 'create', 'edit'
  asset_type text NOT NULL DEFAULT 'image', -- 'image', 'video'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'completed', 'cancelled', 'failed'
  target_folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  result_media_id uuid REFERENCES public.media_items(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.external_editor_sessions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own sessions
CREATE POLICY "Users can manage own editor sessions"
ON public.external_editor_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins can view all sessions
CREATE POLICY "Admins can view all editor sessions"
ON public.external_editor_sessions
FOR SELECT
USING (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()));

-- Create index for performance
CREATE INDEX idx_external_editor_sessions_user_id ON public.external_editor_sessions(user_id);
CREATE INDEX idx_external_editor_sessions_status ON public.external_editor_sessions(status);
CREATE INDEX idx_external_editor_sessions_provider ON public.external_editor_sessions(provider);