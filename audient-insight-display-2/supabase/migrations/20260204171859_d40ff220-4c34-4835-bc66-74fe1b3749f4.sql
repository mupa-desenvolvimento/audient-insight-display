-- Adicionar campo code às empresas para validação via código no setup de dispositivos
-- O código segue o formato: 3 números + 3 letras (ex: 123ABC)
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS code VARCHAR(6) UNIQUE;

-- Gerar códigos iniciais para empresas existentes
-- Baseado no padrão numérico sequencial + letras do slug
DO $$
DECLARE
  company_record RECORD;
  counter INTEGER := 100;
  code_letters VARCHAR(3);
BEGIN
  FOR company_record IN SELECT id, slug FROM companies WHERE code IS NULL
  LOOP
    -- Pega as primeiras 3 letras do slug, ou ABC se não houver
    code_letters := UPPER(SUBSTRING(REGEXP_REPLACE(company_record.slug, '[^a-zA-Z]', '', 'g'), 1, 3));
    IF LENGTH(code_letters) < 3 THEN
      code_letters := code_letters || REPEAT('A', 3 - LENGTH(code_letters));
    END IF;
    
    -- Atualiza com o código gerado
    UPDATE companies 
    SET code = counter::TEXT || code_letters 
    WHERE id = company_record.id;
    
    counter := counter + 1;
  END LOOP;
END $$;

-- Adicionar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_companies_code ON public.companies(code);