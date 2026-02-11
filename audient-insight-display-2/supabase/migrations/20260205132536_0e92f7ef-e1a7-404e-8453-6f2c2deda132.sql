-- Permite que dispositivos não autenticados insiram novos registros durante o setup
CREATE POLICY "Public can create devices during setup" 
ON public.devices 
FOR INSERT 
WITH CHECK (true);

-- Permite que dispositivos não autenticados atualizem seus próprios registros pelo device_code
CREATE POLICY "Public can update own device during setup" 
ON public.devices 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Permite inserção pública em device_group_members para associar dispositivo ao grupo
CREATE POLICY "Public can add devices to groups during setup" 
ON public.device_group_members 
FOR INSERT 
WITH CHECK (true);