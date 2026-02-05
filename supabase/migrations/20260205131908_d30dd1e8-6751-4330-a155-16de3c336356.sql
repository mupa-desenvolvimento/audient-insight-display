-- Adiciona policy para permitir validação de código de empresa sem autenticação
-- Necessário para o fluxo de setup de dispositivos que não requer login

CREATE POLICY "Public can validate company code" 
ON public.companies 
FOR SELECT 
USING (
  -- Permite leitura apenas para empresas ativas
  -- O frontend só usa isso para validar se o código existe
  is_active = true
);