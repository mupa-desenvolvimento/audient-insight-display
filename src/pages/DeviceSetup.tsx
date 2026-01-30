import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';
import { Loader2, Monitor, Building2, Layers, CheckCircle, LogOut, Search, ChevronsUpDown, Check } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const emailSchema = z.string().email('Email inválido').max(255);
const passwordSchema = z.string().min(6, 'Mínimo 6 caracteres').max(72);

interface Store {
  id: string;
  code: string;
  name: string;
}

interface DeviceGroup {
  id: string;
  name: string;
  description: string | null;
  store_id: string | null;
  screen_type: string | null;
}

type SetupStep = 'login' | 'store' | 'group' | 'complete';

export default function DeviceSetup() {
  const { deviceId } = useParams<{ deviceId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading, signIn, signOut } = useAuth();
  
  const [step, setStep] = useState<SetupStep>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Store/Group state
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [storeSearchOpen, setStoreSearchOpen] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  
  // Device state
  const [deviceName, setDeviceName] = useState('');

  // Update step based on auth state
  useEffect(() => {
    if (!authLoading && user) {
      setStep('store');
      fetchUserStores();
    } else if (!authLoading && !user) {
      setStep('login');
    }
  }, [user, authLoading]);

  // Fetch stores when user is authenticated
  const fetchUserStores = async () => {
    setIsLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, code, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStores(data || []);
      
      // Auto-select if only one store
      if (data && data.length === 1) {
        setSelectedStoreId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Erro ao carregar lojas');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Fetch device groups when store is selected
  useEffect(() => {
    if (selectedStoreId) {
      fetchDeviceGroups(selectedStoreId);
    } else {
      setDeviceGroups([]);
      setSelectedGroupId('');
    }
  }, [selectedStoreId]);

  const fetchDeviceGroups = async (storeId: string) => {
    setIsLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('device_groups')
        .select('id, name, description, store_id, screen_type')
        .or(`store_id.eq.${storeId},store_id.is.null`)
        .order('name');

      if (error) throw error;
      setDeviceGroups(data || []);
    } catch (error) {
      console.error('Error fetching device groups:', error);
      toast.error('Erro ao carregar grupos');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    setIsSubmitting(false);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else {
        toast.error('Erro ao fazer login');
      }
    } else {
      toast.success('Login realizado com sucesso');
    }
  };

  const handleLogout = async () => {
    await signOut();
    setStep('login');
    setEmail('');
    setPassword('');
    setSelectedStoreId('');
    setSelectedGroupId('');
  };

  const handleStoreConfirm = () => {
    if (!selectedStoreId) {
      toast.error('Selecione uma loja');
      return;
    }
    setStep('group');
  };

  const handleGroupConfirm = async () => {
    if (!selectedGroupId) {
      toast.error('Selecione um grupo');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if device exists, if not create it
      const { data: existingDevice, error: fetchError } = await supabase
        .from('devices')
        .select('id')
        .eq('device_code', deviceId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingDevice) {
        // Update existing device
        const { error: updateError } = await supabase
          .from('devices')
          .update({ 
            store_id: selectedStoreId,
            name: deviceName || `Dispositivo ${deviceId?.slice(0, 8)}`,
            status: 'online',
            is_active: true
          })
          .eq('id', existingDevice.id);

        if (updateError) throw updateError;

        // Add to device group
        const { error: memberError } = await supabase
          .from('device_group_members')
          .upsert({
            device_id: existingDevice.id,
            group_id: selectedGroupId
          }, { onConflict: 'device_id,group_id' });

        if (memberError && memberError.code !== '23505') {
          console.error('Error adding to group:', memberError);
        }
      } else {
        // Create new device
        const { data: newDevice, error: createError } = await supabase
          .from('devices')
          .insert({
            device_code: deviceId,
            name: deviceName || `Dispositivo ${deviceId?.slice(0, 8)}`,
            store_id: selectedStoreId,
            status: 'online',
            is_active: true
          })
          .select()
          .single();

        if (createError) throw createError;

        // Add to device group
        if (newDevice) {
          const { error: memberError } = await supabase
            .from('device_group_members')
            .insert({
              device_id: newDevice.id,
              group_id: selectedGroupId
            });

          if (memberError) {
            console.error('Error adding to group:', memberError);
          }
        }
      }

      toast.success('Dispositivo configurado com sucesso!');
      setStep('complete');
    } catch (error) {
      console.error('Error configuring device:', error);
      toast.error('Erro ao configurar dispositivo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartPlayer = () => {
    // Usa o player otimizado para WebView (Kodular/Android)
    navigate(`/webview/${deviceId}`);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const selectedStore = stores.find(s => s.id === selectedStoreId);
  const selectedGroup = deviceGroups.find(g => g.id === selectedGroupId);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <Monitor className="h-5 w-5 text-primary" />
          <span className="font-semibold">Configuração do Dispositivo</span>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Steps indicator */}
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-8">
            {(['login', 'store', 'group', 'complete'] as SetupStep[]).map((s, index) => (
              <div key={s} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step === s ? 'bg-primary text-primary-foreground' : 
                    ((['login', 'store', 'group', 'complete'].indexOf(step) > index) ? 
                      'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}
                `}>
                  {['login', 'store', 'group', 'complete'].indexOf(step) > index ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 3 && (
                  <div className={`w-12 h-0.5 mx-1 ${
                    ['login', 'store', 'group', 'complete'].indexOf(step) > index ? 
                      'bg-primary/50' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center p-4">
        <Card className="w-full max-w-md">
          {/* Login Step */}
          {step === 'login' && (
            <>
              <CardHeader className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Monitor className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle>Identificação</CardTitle>
                <CardDescription>
                  Entre com suas credenciais para configurar o dispositivo
                </CardDescription>
                <div className="bg-muted/50 p-2 rounded-lg">
                  <code className="text-xs text-muted-foreground">ID: {deviceId}</code>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {/* Store Selection Step */}
          {step === 'store' && (
            <>
              <CardHeader className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle>Selecione a Loja</CardTitle>
                <CardDescription>
                  Escolha a loja onde este dispositivo será instalado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingData ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : stores.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma loja disponível
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Loja</Label>
                      <Popover open={storeSearchOpen} onOpenChange={setStoreSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={storeSearchOpen}
                            className="w-full justify-between font-normal"
                          >
                            {selectedStoreId ? (
                              <span>
                                <span className="font-medium">{stores.find(s => s.id === selectedStoreId)?.code}</span>
                                <span className="text-muted-foreground ml-2">- {stores.find(s => s.id === selectedStoreId)?.name}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Buscar loja por código ou nome...</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput 
                              placeholder="Digite código ou nome da loja..." 
                              value={storeSearchQuery}
                              onValueChange={setStoreSearchQuery}
                            />
                            <CommandList>
                              <CommandEmpty>Nenhuma loja encontrada.</CommandEmpty>
                              <CommandGroup>
                                {stores
                                  .filter(store => {
                                    if (!storeSearchQuery) return true;
                                    const query = storeSearchQuery.toLowerCase();
                                    return store.code.toLowerCase().includes(query) || 
                                           store.name.toLowerCase().includes(query);
                                  })
                                  .slice(0, 50) // Limit results for performance
                                  .map((store) => (
                                    <CommandItem
                                      key={store.id}
                                      value={store.id}
                                      onSelect={() => {
                                        setSelectedStoreId(store.id);
                                        setStoreSearchOpen(false);
                                        setStoreSearchQuery('');
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          selectedStoreId === store.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <span className="font-medium">{store.code}</span>
                                      <span className="text-muted-foreground ml-2">- {store.name}</span>
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {stores.length > 50 && (
                        <p className="text-xs text-muted-foreground">
                          {stores.length} lojas disponíveis. Use a busca para filtrar.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deviceName">Nome do Dispositivo (opcional)</Label>
                      <Input
                        id="deviceName"
                        placeholder={`Dispositivo ${deviceId?.slice(0, 8)}`}
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                      />
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleStoreConfirm}
                      disabled={!selectedStoreId}
                    >
                      Continuar
                    </Button>
                  </>
                )}
              </CardContent>
            </>
          )}

          {/* Group Selection Step */}
          {step === 'group' && (
            <>
              <CardHeader className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Layers className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <CardTitle>Selecione o Grupo</CardTitle>
                <CardDescription>
                  Escolha o grupo de dispositivos para definir o conteúdo
                </CardDescription>
                {selectedStore && (
                  <div className="bg-muted/50 p-2 rounded-lg">
                    <span className="text-sm">
                      Loja: <strong>{selectedStore.code}</strong> - {selectedStore.name}
                    </span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingData ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : deviceGroups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum grupo disponível para esta loja
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Grupo</Label>
                      <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um grupo" />
                        </SelectTrigger>
                        <SelectContent>
                          {deviceGroups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{group.name}</span>
                                {group.description && (
                                  <span className="text-xs text-muted-foreground">
                                    {group.description}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1" 
                        onClick={() => setStep('store')}
                      >
                        Voltar
                      </Button>
                      <Button 
                        className="flex-1" 
                        onClick={handleGroupConfirm}
                        disabled={!selectedGroupId || isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          'Confirmar'
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <>
              <CardHeader className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <CardTitle>Configuração Concluída!</CardTitle>
                <CardDescription>
                  O dispositivo está pronto para iniciar a reprodução
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dispositivo:</span>
                    <span className="font-medium">{deviceName || deviceId?.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Loja:</span>
                    <span className="font-medium">{selectedStore?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grupo:</span>
                    <span className="font-medium">{selectedGroup?.name}</span>
                  </div>
                </div>

                <Button className="w-full" onClick={handleStartPlayer}>
                  <Monitor className="mr-2 h-4 w-4" />
                  Iniciar Player
                </Button>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
