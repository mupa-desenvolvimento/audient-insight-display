-- Adicionar novos campos na tabela stores
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS bairro text,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS regional_responsavel text;

-- Criar índice para CNPJ (busca rápida)
CREATE INDEX IF NOT EXISTS idx_stores_cnpj ON public.stores(cnpj);

-- Criar índice para CEP
CREATE INDEX IF NOT EXISTS idx_stores_cep ON public.stores(cep);