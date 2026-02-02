-- ============================================
-- Sistema de Consulta de Preços: Modelo de Dados
-- ============================================

-- Tabela de Empresas/Clientes
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  cnpj TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para companies
CREATE INDEX idx_companies_tenant_id ON public.companies(tenant_id);
CREATE INDEX idx_companies_slug ON public.companies(slug);

-- Tabela de Integrações de API disponíveis
CREATE TABLE public.api_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  base_url TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'bearer', -- bearer, basic, api_key
  endpoints JSONB DEFAULT '{}'::jsonb,
  default_settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de vínculo Empresa ↔ Integração (com credenciais e parâmetros)
CREATE TABLE public.company_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.api_integrations(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  credentials JSONB DEFAULT '{}'::jsonb, -- Armazenado de forma segura
  settings JSONB DEFAULT '{}'::jsonb, -- loja, timeouts, flags, etc.
  token_cache JSONB DEFAULT '{}'::jsonb, -- token, expires_at
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, integration_id)
);

-- Índices para company_integrations
CREATE INDEX idx_company_integrations_company_id ON public.company_integrations(company_id);
CREATE INDEX idx_company_integrations_integration_id ON public.company_integrations(integration_id);

-- Adicionar company_id na tabela de dispositivos
ALTER TABLE public.devices ADD COLUMN company_id UUID REFERENCES public.companies(id);
CREATE INDEX idx_devices_company_id ON public.devices(company_id);

-- Tabela de cache de produtos consultados
CREATE TABLE public.product_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ean TEXT NOT NULL,
  store_code TEXT NOT NULL,
  product_data JSONB NOT NULL,
  image_url TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, ean, store_code)
);

-- Índices para product_cache
CREATE INDEX idx_product_cache_lookup ON public.product_cache(company_id, ean, store_code);
CREATE INDEX idx_product_cache_expires ON public.product_cache(expires_at);

-- Tabela de logs de consultas de produtos
CREATE TABLE public.product_lookup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID REFERENCES public.devices(id),
  company_id UUID REFERENCES public.companies(id),
  ean TEXT NOT NULL,
  store_code TEXT,
  status TEXT NOT NULL, -- success, not_found, error
  latency_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para product_lookup_logs
CREATE INDEX idx_product_lookup_logs_device_id ON public.product_lookup_logs(device_id);
CREATE INDEX idx_product_lookup_logs_company_id ON public.product_lookup_logs(company_id);
CREATE INDEX idx_product_lookup_logs_created_at ON public.product_lookup_logs(created_at);

-- RLS para companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins can manage companies"
ON public.companies FOR ALL
USING (is_super_admin(auth.uid()) OR (is_tenant_admin(auth.uid()) AND can_access_tenant_data(auth.uid(), tenant_id)))
WITH CHECK (is_super_admin(auth.uid()) OR (is_tenant_admin(auth.uid()) AND can_access_tenant_data(auth.uid(), tenant_id)));

CREATE POLICY "Users can read their companies"
ON public.companies FOR SELECT
USING (is_super_admin(auth.uid()) OR can_access_tenant_data(auth.uid(), tenant_id));

-- RLS para api_integrations (somente super admins gerenciam, todos leem)
ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage integrations"
ON public.api_integrations FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated can read integrations"
ON public.api_integrations FOR SELECT
USING (true);

-- RLS para company_integrations
ALTER TABLE public.company_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage company integrations"
ON public.company_integrations FOR ALL
USING (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()));

CREATE POLICY "Authenticated can read company integrations"
ON public.company_integrations FOR SELECT
USING (true);

-- RLS para product_cache
ALTER TABLE public.product_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage product cache"
ON public.product_cache FOR ALL
USING (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()));

CREATE POLICY "Devices can insert/update cache"
ON public.product_cache FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can read cache"
ON public.product_cache FOR SELECT
USING (true);

-- RLS para product_lookup_logs
ALTER TABLE public.product_lookup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Devices can insert logs"
ON public.product_lookup_logs FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can read logs"
ON public.product_lookup_logs FOR SELECT
USING (is_super_admin(auth.uid()) OR is_admin(auth.uid()) OR is_tenant_admin(auth.uid()));

-- Inserir integração Zaffari como exemplo
INSERT INTO public.api_integrations (name, slug, description, base_url, auth_type, endpoints, default_settings)
VALUES (
  'Zaffari Express',
  'zaffari-express',
  'Integração com API do Zaffari Express para consulta de preços',
  'https://zaffariexpress.com.br/api',
  'bearer',
  '{
    "login": {"method": "POST", "path": "/login/login"},
    "price": {"method": "GET", "path": "/v1/consultapreco/precos"}
  }'::jsonb,
  '{
    "token_ttl_minutes": 60,
    "cache_ttl_minutes": 15,
    "timeout_ms": 10000,
    "image_base_url": "http://srv-mupa.ddns.net:5050/produto-imagem"
  }'::jsonb
);

-- Triggers para updated_at
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_integrations_updated_at
BEFORE UPDATE ON public.api_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_integrations_updated_at
BEFORE UPDATE ON public.company_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_cache_updated_at
BEFORE UPDATE ON public.product_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();