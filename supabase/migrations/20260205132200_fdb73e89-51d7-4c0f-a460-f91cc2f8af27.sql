-- Adiciona policy para permitir leitura pública de lojas ativas
-- Necessário para o fluxo de setup de dispositivos sem autenticação

CREATE POLICY "Public can read active stores for device setup" 
ON public.stores 
FOR SELECT 
USING (is_active = true);

-- Também precisamos permitir leitura pública de device_groups para o setup
CREATE POLICY "Public can read device groups for setup" 
ON public.device_groups 
FOR SELECT 
USING (true);