-- Tabela para registrar consultas de produtos com dados demográficos
CREATE TABLE public.product_lookup_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  store_code text,
  ean text NOT NULL,
  product_name text,
  product_data jsonb DEFAULT '{}'::jsonb,
  
  -- Dados demográficos do consultor (via detecção facial)
  gender text, -- 'male', 'female', 'unknown'
  age_group text, -- 'child', 'teen', 'adult', 'senior'
  age_estimate integer,
  emotion text, -- 'happy', 'neutral', 'sad', 'angry', 'surprised', etc.
  emotion_confidence real,
  
  -- Contadores e timestamps
  lookup_count integer DEFAULT 1,
  first_lookup_at timestamptz NOT NULL DEFAULT now(),
  last_lookup_at timestamptz NOT NULL DEFAULT now(),
  lookup_date date NOT NULL DEFAULT CURRENT_DATE,
  
  -- Dados enriquecidos por IA
  ai_enriched boolean DEFAULT false,
  ai_description text,
  ai_category text,
  ai_tags text[],
  ai_enriched_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para consultas eficientes
CREATE INDEX idx_product_analytics_ean ON public.product_lookup_analytics(ean);
CREATE INDEX idx_product_analytics_date ON public.product_lookup_analytics(lookup_date);
CREATE INDEX idx_product_analytics_store ON public.product_lookup_analytics(store_code);
CREATE INDEX idx_product_analytics_device ON public.product_lookup_analytics(device_id);
CREATE INDEX idx_product_analytics_gender ON public.product_lookup_analytics(gender);
CREATE INDEX idx_product_analytics_age ON public.product_lookup_analytics(age_group);

-- Índice composto para agregações por produto/dia
CREATE INDEX idx_product_analytics_ean_date ON public.product_lookup_analytics(ean, lookup_date);

-- Enable RLS
ALTER TABLE public.product_lookup_analytics ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage analytics"
ON public.product_lookup_analytics
FOR ALL
USING (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()));

CREATE POLICY "Devices can insert analytics"
ON public.product_lookup_analytics
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can read analytics"
ON public.product_lookup_analytics
FOR SELECT
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_product_lookup_analytics_updated_at
BEFORE UPDATE ON public.product_lookup_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();