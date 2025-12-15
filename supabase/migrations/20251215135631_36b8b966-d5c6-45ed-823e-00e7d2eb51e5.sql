-- =============================================
-- SISTEMA DE DIGITAL SIGNAGE - ESTRUTURA BASE
-- =============================================

-- 1. ENUM DE PAPÉIS
CREATE TYPE public.app_role AS ENUM ('admin_global', 'admin_regional', 'admin_loja', 'operador_conteudo', 'tecnico');

-- 2. TABELA DE PAÍSES
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABELA DE REGIÕES
CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_id, name)
);

-- 4. TABELA DE ESTADOS
CREATE TABLE public.states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(region_id, code)
);

-- 5. TABELA DE CIDADES
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_id UUID NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(state_id, name)
);

-- 6. TABELA DE LOJAS
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TABELA DE PERFIS DE USUÁRIO
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. TABELA DE PAPÉIS DE USUÁRIO
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 9. TABELA DE PERMISSÕES POR ENTIDADE (escopo de acesso)
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('country', 'region', 'state', 'city', 'store')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

-- 10. TABELA DE LOGS DE IMPORTAÇÃO
CREATE TABLE public.import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  file_name TEXT,
  total_rows INTEGER DEFAULT 0,
  success_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- =============================================
-- FUNÇÕES DE SEGURANÇA
-- =============================================

-- Função para verificar papel do usuário
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Função para verificar se é admin (global ou regional)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin_global', 'admin_regional')
  )
$$;

-- Função para verificar acesso a loja
CREATE OR REPLACE FUNCTION public.has_store_access(_user_id UUID, _store_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _store RECORD;
BEGIN
  -- Admin global tem acesso a tudo
  IF public.has_role(_user_id, 'admin_global') THEN
    RETURN true;
  END IF;

  -- Buscar dados da loja
  SELECT s.id, s.city_id, c.state_id, st.region_id, r.country_id
  INTO _store
  FROM public.stores s
  JOIN public.cities c ON c.id = s.city_id
  JOIN public.states st ON st.id = c.state_id
  JOIN public.regions r ON r.id = st.region_id
  WHERE s.id = _store_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Verificar permissões em qualquer nível da hierarquia
  RETURN EXISTS (
    SELECT 1 FROM public.user_permissions up
    WHERE up.user_id = _user_id AND (
      (up.entity_type = 'store' AND up.entity_id = _store_id) OR
      (up.entity_type = 'city' AND up.entity_id = _store.city_id) OR
      (up.entity_type = 'state' AND up.entity_id = _store.state_id) OR
      (up.entity_type = 'region' AND up.entity_id = _store.region_id) OR
      (up.entity_type = 'country' AND up.entity_id = _store.country_id)
    )
  );
END;
$$;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_regions_updated_at BEFORE UPDATE ON public.regions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_states_updated_at BEFORE UPDATE ON public.states FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON public.cities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Countries: todos autenticados podem ler, apenas admin_global pode modificar
CREATE POLICY "Authenticated users can read countries" ON public.countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin global can manage countries" ON public.countries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_global')) WITH CHECK (public.has_role(auth.uid(), 'admin_global'));

-- Regions: todos autenticados podem ler, admins podem modificar
CREATE POLICY "Authenticated users can read regions" ON public.regions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage regions" ON public.regions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- States: todos autenticados podem ler, admins podem modificar
CREATE POLICY "Authenticated users can read states" ON public.states FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage states" ON public.states FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Cities: todos autenticados podem ler, admins podem modificar
CREATE POLICY "Authenticated users can read cities" ON public.cities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage cities" ON public.cities FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Stores: acesso baseado em permissões
CREATE POLICY "Users can read accessible stores" ON public.stores FOR SELECT TO authenticated USING (public.has_store_access(auth.uid(), id));
CREATE POLICY "Admins can manage stores" ON public.stores FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Profiles: usuários podem ver todos, editar apenas o próprio
CREATE POLICY "Users can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- User roles: apenas admin_global pode gerenciar
CREATE POLICY "Admin global can read roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin_global') OR user_id = auth.uid());
CREATE POLICY "Admin global can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin_global')) WITH CHECK (public.has_role(auth.uid(), 'admin_global'));

-- User permissions: apenas admins podem gerenciar
CREATE POLICY "Admins can read permissions" ON public.user_permissions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "Admins can manage permissions" ON public.user_permissions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Import logs: usuários veem seus próprios logs, admins veem todos
CREATE POLICY "Users can read own import logs" ON public.import_logs FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "Authenticated users can create import logs" ON public.import_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage import logs" ON public.import_logs FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- =============================================
-- DADOS INICIAIS
-- =============================================

INSERT INTO public.countries (name, code) VALUES ('Brasil', 'BR');

INSERT INTO public.regions (country_id, name, code)
SELECT c.id, r.name, r.code
FROM public.countries c, 
(VALUES 
  ('Norte', 'N'),
  ('Nordeste', 'NE'),
  ('Centro-Oeste', 'CO'),
  ('Sudeste', 'SE'),
  ('Sul', 'S')
) AS r(name, code)
WHERE c.code = 'BR';