import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStores } from '@/hooks/useStores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Upload, Store, MapPin, Edit, Trash2, Loader2, Download, Map, RefreshCw } from 'lucide-react';
import { StoreWithHierarchy, City, State } from '@/types/database';
import { toast } from 'sonner';
import { StoreImportDialog } from '@/components/stores/StoreImportDialog';
import { supabase } from '@/integrations/supabase/client';
import { PageShell } from '@/components/layout/PageShell';
import { ListViewport } from '@/components/list/ListViewport';
import { ListControls } from '@/components/list/ListControls';
import { UniversalPagination } from '@/components/list/UniversalPagination';
import { useListState } from '@/hooks/useListState';
import {
  Select as UiSelect,
  SelectContent as UiSelectContent,
  SelectItem as UiSelectItem,
  SelectTrigger as UiSelectTrigger,
  SelectValue as UiSelectValue,
} from '@/components/ui/select';

interface StoreFormData {
  code: string;
  name: string;
  city_id: string;
  address: string;
  cnpj: string;
  bairro: string;
  cep: string;
  regional_responsavel: string;
  lat: string;
  lng: string;
}

interface CityWithState extends City {
  state?: State;
}

interface StoreFormProps {
  formData: StoreFormData;
  setFormData: React.Dispatch<React.SetStateAction<StoreFormData>>;
  cities: CityWithState[];
}

const StoreForm = ({ formData, setFormData, cities }: StoreFormProps) => {
  const [isGeocoding, setIsGeocoding] = useState(false);

  const handleGeocode = async () => {
    const city = cities.find(c => c.id === formData.city_id);
    const addressParts = [
      formData.address,
      formData.bairro,
      city?.name,
      city?.state?.name || city?.state?.code,
      'Brasil'
    ].filter(Boolean);
    
    if (addressParts.length < 2) {
      toast.error('Preencha pelo menos o endereço e a cidade');
      return;
    }
    
    const fullAddress = addressParts.join(', ');
    setIsGeocoding(true);
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        setFormData(prev => ({
          ...prev,
          lat: data[0].lat,
          lng: data[0].lon
        }));
        toast.success('Coordenadas encontradas!');
      } else {
        toast.error('Endereço não encontrado');
      }
    } catch (error) {
      toast.error('Erro ao buscar coordenadas');
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Código *</Label>
        <Input
          placeholder="Ex: LJ001"
          value={formData.code}
          onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label>Unidade (Nome) *</Label>
        <Input
          placeholder="Nome da loja"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Regional (Responsável)</Label>
        <Input
          placeholder="Nome do responsável"
          value={formData.regional_responsavel}
          onChange={(e) => setFormData((prev) => ({ ...prev, regional_responsavel: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label>CNPJ</Label>
        <Input
          placeholder="00.000.000/0000-00"
          value={formData.cnpj}
          onChange={(e) => setFormData((prev) => ({ ...prev, cnpj: e.target.value }))}
        />
      </div>
    </div>

    <div className="space-y-2">
      <Label>Endereço</Label>
      <div className="flex gap-2">
        <Input
          placeholder="Endereço completo"
          value={formData.address}
          onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
        />
        <Button 
          type="button" 
          variant="outline" 
          onClick={handleGeocode}
          disabled={isGeocoding}
          title="Buscar coordenadas pelo endereço"
        >
          {isGeocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        </Button>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Bairro</Label>
        <Input
          placeholder="Bairro"
          value={formData.bairro}
          onChange={(e) => setFormData((prev) => ({ ...prev, bairro: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label>CEP</Label>
        <Input
          placeholder="00000-000"
          value={formData.cep}
          onChange={(e) => setFormData((prev) => ({ ...prev, cep: e.target.value }))}
        />
      </div>
    </div>

    <div className="space-y-2">
      <Label>Cidade *</Label>
      <Select
        value={formData.city_id}
        onValueChange={(value) => setFormData((prev) => ({ ...prev, city_id: value }))}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione a cidade" />
        </SelectTrigger>
        <SelectContent>
          {cities.map((city) => (
            <SelectItem key={city.id} value={city.id}>
              {city.name} - {city.state?.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Latitude</Label>
        <Input
          placeholder="-23.550520"
          value={formData.lat}
          onChange={(e) => setFormData((prev) => ({ ...prev, lat: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label>Longitude</Label>
        <Input
          placeholder="-46.633308"
          value={formData.lng}
          onChange={(e) => setFormData((prev) => ({ ...prev, lng: e.target.value }))}
        />
      </div>
    </div>
  </div>
  );
};

export default function Stores() {
  const navigate = useNavigate();
  const { stores, cities, isLoading, updateStore, deleteStore, refetch } = useStores();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreWithHierarchy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<StoreFormData>({
    code: '',
    name: '',
    city_id: '',
    address: '',
    cnpj: '',
    bairro: '',
    cep: '',
    regional_responsavel: '',
    lat: '',
    lng: '',
  });

  type StoreStatusFilter = 'all' | 'active' | 'inactive';

  interface StoreFilters {
    status: StoreStatusFilter;
  }

  const {
    state,
    setView,
    setPage,
    setPageSize,
    setSearch,
    setFilters,
    reset,
  } = useListState<StoreFilters>({
    initialFilters: { status: 'all' },
    initialPageSize: 10,
  });

  const filteredStores = useMemo(() => {
    const term = state.search.toLowerCase().trim();
    const statusFilter = state.filters.status;

    return stores.filter((store) => {
      const matchesTerm =
        !term ||
        store.name.toLowerCase().includes(term) ||
        store.code.toLowerCase().includes(term) ||
        store.city?.name.toLowerCase().includes(term) ||
        store.city?.state?.name.toLowerCase().includes(term) ||
        (store as any).cnpj?.toLowerCase().includes(term) ||
        (store as any).regional_responsavel?.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
          ? store.is_active
          : !store.is_active;

      return matchesTerm && matchesStatus;
    });
  }, [stores, state.search, state.filters]);

  const totalStores = filteredStores.length;
  const startIndex = (state.page - 1) * state.pageSize;
  const paginatedStores =
    totalStores === 0
      ? []
      : filteredStores.slice(startIndex, startIndex + state.pageSize);

  const resetForm = () => {
    setFormData({ code: '', name: '', city_id: '', address: '', cnpj: '', bairro: '', cep: '', regional_responsavel: '', lat: '', lng: '' });
  };

  const handleCreate = async () => {
    if (!formData.code || !formData.name || !formData.city_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('stores')
        .insert({
          code: formData.code,
          name: formData.name,
          city_id: formData.city_id,
          address: formData.address || null,
          cnpj: formData.cnpj || null,
          bairro: formData.bairro || null,
          cep: formData.cep || null,
          regional_responsavel: formData.regional_responsavel || null,
          is_active: true,
          metadata: {
            lat: formData.lat,
            lng: formData.lng
          },
        });

      if (error) throw error;
      toast.success('Loja criada com sucesso');
      setIsCreateOpen(false);
      resetForm();
      // Trigger refetch
      window.location.reload();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Já existe uma loja com este código');
      } else {
        toast.error('Erro ao criar loja');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (store: StoreWithHierarchy) => {
    setSelectedStore(store);
    const meta = store.metadata as any || {};
    setFormData({
      code: store.code,
      name: store.name,
      city_id: store.city_id,
      address: store.address || '',
      cnpj: (store as any).cnpj || '',
      bairro: (store as any).bairro || '',
      cep: (store as any).cep || '',
      regional_responsavel: (store as any).regional_responsavel || '',
      lat: meta.lat || '',
      lng: meta.lng || '',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedStore || !formData.code || !formData.name || !formData.city_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    const currentMeta = (selectedStore?.metadata as any) || {};

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          code: formData.code,
          name: formData.name,
          city_id: formData.city_id,
          address: formData.address || null,
          cnpj: formData.cnpj || null,
          bairro: formData.bairro || null,
          cep: formData.cep || null,
          regional_responsavel: formData.regional_responsavel || null,
          metadata: {
            ...currentMeta,
            lat: formData.lat,
            lng: formData.lng
          }
        })
        .eq('id', selectedStore.id);

      if (error) throw error;
      toast.success('Loja atualizada com sucesso');
      setIsEditOpen(false);
      setSelectedStore(null);
      resetForm();
      window.location.reload();
    } catch (error) {
      toast.error('Erro ao atualizar loja');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (store: StoreWithHierarchy) => {
    if (!confirm(`Tem certeza que deseja excluir a loja "${store.name}"?`)) return;

    try {
      await deleteStore(store.id);
    } catch (error) {
      // Error handled in hook
    }
  };

  const toggleActive = async (store: StoreWithHierarchy) => {
    try {
      await updateStore(store.id, { is_active: !store.is_active });
    } catch (error) {
      // Error handled in hook
    }
  };

  const exportCSV = () => {
    const headers = ['codigo', 'nome', 'regional', 'cnpj', 'endereco', 'bairro', 'cep', 'cidade', 'estado'];
    const rows = stores.map(store => [
      store.code,
      store.name,
      (store as any).regional_responsavel || '',
      (store as any).cnpj || '',
      store.address || '',
      (store as any).bairro || '',
      (store as any).cep || '',
      store.city?.name || '',
      store.city?.state?.code || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lojas_exportadas.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Lojas exportadas com sucesso');
  };

  const syncCoordinates = async () => {
    const storesToUpdate = stores.filter(store => {
      const meta = store.metadata as any || {};
      return !meta.lat || !meta.lng;
    });

    if (storesToUpdate.length === 0) {
      toast.info('Todas as lojas já possuem coordenadas.');
      return;
    }

    if (!confirm(`Deseja buscar coordenadas para ${storesToUpdate.length} lojas? Isso pode levar algum tempo (aprox. ${(storesToUpdate.length * 1.2 / 60).toFixed(1)} min).`)) {
      return;
    }

    setIsSubmitting(true);
    let updatedCount = 0;
    let errorCount = 0;
    const toastId = toast.loading('Iniciando sincronização...');

    try {
      for (let i = 0; i < storesToUpdate.length; i++) {
        const store = storesToUpdate[i];
        toast.loading(`Processando ${i + 1}/${storesToUpdate.length}: ${store.name}`, { id: toastId });

        const addressParts = [
          store.address,
          (store as any).bairro,
          store.city?.name,
          store.city?.state?.name || store.city?.state?.code,
          'Brasil'
        ].filter(Boolean);

        if (addressParts.length < 2) {
          console.warn(`Endereço insuficiente para loja ${store.name}`);
          errorCount++;
          continue;
        }

        const fullAddress = addressParts.join(', ');

        try {
          // Delay to respect Nominatim rate limit (1 req/sec)
          await new Promise(resolve => setTimeout(resolve, 1200));

          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`);
          const data = await response.json();

          if (data && data.length > 0) {
            const currentMeta = (store.metadata as any) || {};
            const { error } = await supabase
              .from('stores')
              .update({
                metadata: {
                  ...currentMeta,
                  lat: data[0].lat,
                  lng: data[0].lon
                }
              })
              .eq('id', store.id);

            if (error) throw error;
            updatedCount++;
          } else {
            console.warn(`Coordenadas não encontradas para ${store.name}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`Erro ao processar loja ${store.name}:`, error);
          errorCount++;
        }
      }

      toast.success(`Sincronização concluída! ${updatedCount} atualizadas, ${errorCount} falhas.`, { id: toastId });
      refetch();
    } catch (error) {
      toast.error('Erro geral na sincronização', { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageShell
      className="animate-fade-in"
      header={
        <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground">
            Gerencie todas as lojas do sistema ({stores.length} lojas)
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/stores/map')}>
              <Map className="mr-2 h-4 w-4" />
              Ver no Mapa
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button
              variant="outline"
              onClick={syncCoordinates}
              disabled={isSubmitting}
              title="Buscar coordenadas para lojas sem lat/lng"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sincronizar Coordenadas
            </Button>
            <Button variant="outline" onClick={() => setIsImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Loja
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nova Loja</DialogTitle>
                  <DialogDescription>Adicione uma nova loja ao sistema</DialogDescription>
                </DialogHeader>
                <StoreForm formData={formData} setFormData={setFormData} cities={cities} />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      }
      controls={
        <div className="py-2">
          <ListControls
            state={state}
            onSearchChange={setSearch}
            onViewChange={setView}
            onClearFilters={reset}
          >
            <UiSelect
              value={state.filters.status}
              onValueChange={(value) =>
                setFilters({
                  ...state.filters,
                  status: value as StoreStatusFilter,
                })
              }
            >
              <UiSelectTrigger className="w-[160px]">
                <UiSelectValue placeholder="Status" />
              </UiSelectTrigger>
              <UiSelectContent>
                <UiSelectItem value="all">Todos</UiSelectItem>
                <UiSelectItem value="active">Ativos</UiSelectItem>
                <UiSelectItem value="inactive">Inativos</UiSelectItem>
              </UiSelectContent>
            </UiSelect>
          </ListControls>
        </div>
      }
      footer={
        <UniversalPagination
          page={state.page}
          pageSize={state.pageSize}
          total={totalStores}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      }
    >
      <ListViewport>
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : totalStores === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {state.search
                ? 'Nenhuma loja encontrada'
                : 'Nenhuma loja cadastrada'}
            </CardContent>
          </Card>
        ) : state.view === 'list' ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Listagem de lojas
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cód.</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Regional</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedStores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-mono font-medium">
                          {store.code}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-muted-foreground" />
                            {store.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {(store as any).regional_responsavel || '-'}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {(store as any).cnpj || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="text-sm">
                              {store.city?.name}, {store.city?.state?.code}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={store.is_active ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => toggleActive(store)}
                          >
                            {store.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(store)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(store)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedStores.map((store) => (
              <Card key={store.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Store className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{store.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {store.code}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={store.is_active ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => toggleActive(store)}
                    >
                      {store.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {store.city?.name}, {store.city?.state?.code}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    <div>
                      Regional:{' '}
                      <span className="font-medium">
                        {(store as any).regional_responsavel || '-'}
                      </span>
                    </div>
                    <div>
                      CNPJ:{' '}
                      <span className="font-mono">
                        {(store as any).cnpj || '-'}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(store)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(store)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ListViewport>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Loja</DialogTitle>
            <DialogDescription>Atualize as informações da loja</DialogDescription>
          </DialogHeader>
          <StoreForm formData={formData} setFormData={setFormData} cities={cities} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StoreImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImportComplete={refetch}
      />
    </PageShell>
  );
}
