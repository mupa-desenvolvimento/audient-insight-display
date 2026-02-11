-- Create table for product lookup display settings per company
CREATE TABLE public.product_display_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Layout preset (1, 2, or 3)
  layout_preset integer NOT NULL DEFAULT 1,
  
  -- Font sizes
  title_font_size integer NOT NULL DEFAULT 48,
  subtitle_font_size integer NOT NULL DEFAULT 24,
  price_font_size integer NOT NULL DEFAULT 96,
  original_price_font_size integer NOT NULL DEFAULT 36,
  
  -- Positions
  image_position text NOT NULL DEFAULT 'right', -- 'left' or 'right'
  price_position text NOT NULL DEFAULT 'bottom', -- 'top', 'center', 'bottom'
  
  -- Image background
  remove_image_background boolean NOT NULL DEFAULT false,
  image_background_color text DEFAULT '#FFFFFF',
  
  -- Color extraction
  enable_color_extraction boolean NOT NULL DEFAULT true,
  
  -- Manual colors (used when color extraction is disabled)
  container_primary_color text DEFAULT '#1E3A5F',
  container_secondary_color text DEFAULT '#2D4A6F',
  accent_color text DEFAULT '#3B82F6',
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.product_display_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage display settings"
ON public.product_display_settings
FOR ALL
USING (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()));

CREATE POLICY "Authenticated can read display settings"
ON public.product_display_settings
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_product_display_settings_updated_at
BEFORE UPDATE ON public.product_display_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();