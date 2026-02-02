-- Adicionar coluna store_code diretamente no dispositivo para consulta de preço
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS store_code text;

-- Comentário explicativo
COMMENT ON COLUMN public.devices.store_code IS 'Código da filial/loja usado nas consultas de preço (ex: 8 para Zaffari filial 8)';