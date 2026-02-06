
-- Tabela de catálogo de produtos com perfil demográfico para recomendações
CREATE TABLE public.product_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ean text NOT NULL,
  name text NOT NULL,
  description text,
  category text,
  tags text[] DEFAULT '{}',
  image_url text,
  target_gender text, -- 'male', 'female', 'all'
  target_age_min integer DEFAULT 0,
  target_age_max integer DEFAULT 100,
  target_mood text, -- 'happy', 'sad', 'neutral', 'angry', 'surprised', 'all'
  score integer DEFAULT 50, -- relevância geral (0-100)
  source_data jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ean)
);

-- Enable RLS
ALTER TABLE public.product_recommendations ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ler (terminais públicos)
CREATE POLICY "Anyone can read product recommendations"
ON public.product_recommendations FOR SELECT
USING (true);

-- Admins podem gerenciar
CREATE POLICY "Admins can manage product recommendations"
ON public.product_recommendations FOR ALL
USING (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_product_recommendations_updated_at
BEFORE UPDATE ON public.product_recommendations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para queries de recomendação
CREATE INDEX idx_product_rec_gender ON public.product_recommendations(target_gender);
CREATE INDEX idx_product_rec_mood ON public.product_recommendations(target_mood);
CREATE INDEX idx_product_rec_active ON public.product_recommendations(is_active);
