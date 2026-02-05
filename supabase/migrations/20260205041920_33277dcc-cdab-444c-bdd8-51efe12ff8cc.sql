-- Tabela para armazenar states temporários de autenticação OAuth
CREATE TABLE public.canva_auth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    state TEXT NOT NULL UNIQUE,
    code_verifier TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para limpeza de estados expirados
CREATE INDEX idx_canva_auth_states_expires ON public.canva_auth_states(expires_at);

-- Enable RLS
ALTER TABLE public.canva_auth_states ENABLE ROW LEVEL SECURITY;

-- Policy: service role only (edge function)
CREATE POLICY "Service role only for auth states"
ON public.canva_auth_states
FOR ALL
USING (false)
WITH CHECK (false);

-- Tabela para armazenar conexões Canva dos usuários
CREATE TABLE public.canva_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    scopes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.canva_connections ENABLE ROW LEVEL SECURITY;

-- Policy: usuários podem ver sua própria conexão
CREATE POLICY "Users can view own connection"
ON public.canva_connections
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: service role pode gerenciar (edge function usa service role)
CREATE POLICY "Service role can manage connections"
ON public.canva_connections
FOR ALL
USING (false)
WITH CHECK (false);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_canva_connections_updated_at
    BEFORE UPDATE ON public.canva_connections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();