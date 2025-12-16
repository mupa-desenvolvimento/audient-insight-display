import { useState } from 'react';
import { useStores } from '@/hooks/useStores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Upload, Store, MapPin, Edit, Trash2, Loader2, Download } from 'lucide-react';
import { StoreWithHierarchy } from '@/types/database';
import { toast } from 'sonner';
import { StoreImportDialog } from '@/components/stores/StoreImportDialog';
import { supabase } from '@/integrations/supabase/client';

export default function Stores() {
  const { stores, cities, isLoading, createStore, updateStore, deleteStore } = useStores();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreWithHierarchy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    city_id: '',
    address: '',
    cnpj: '',
    bairro: '',
    cep: '',
    regional_responsavel: '',
  });

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.city?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.city?.state?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (store as any).cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (store as any).regional_responsavel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ code: '', name: '', city_id: '', address: '', cnpj: '', bairro: '', cep: '', regional_responsavel: '' });
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
          metadata: {},
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
    setFormData({
      code: store.code,
      name: store.name,
      city_id: store.city_id,
      address: store.address || '',
      cnpj: (store as any).cnpj || '',
      bairro: (store as any).bairro || '',
      cep: (store as any).cep || '',
      regional_responsavel: (store as any).regional_responsavel || '',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedStore || !formData.code || !formData.name || !formData.city_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const StoreForm = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Código *</Label>
          <Input
            placeholder="Ex: LJ001"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Unidade (Nome) *</Label>
          <Input
            placeholder="Nome da loja"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Regional (Responsável)</Label>
          <Input
            placeholder="Nome do responsável"
            value={formData.regional_responsavel}
            onChange={(e) => setFormData({ ...formData, regional_responsavel: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>CNPJ</Label>
          <Input
            placeholder="00.000.000/0000-00"
            value={formData.cnpj}
            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Endereço</Label>
        <Input
          placeholder="Endereço completo"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Bairro</Label>
          <Input
            placeholder="Bairro"
            value={formData.bairro}
            onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>CEP</Label>
          <Input
            placeholder="00000-000"
            value={formData.cep}
            onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cidade *</Label>
        <Select
          value={formData.city_id}
          onValueChange={(value) => setFormData({ ...formData, city_id: value })}
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
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lojas</h1>
          <p className="text-muted-foreground">Gerencie todas as lojas do sistema ({stores.length} lojas)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
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
              <StoreForm />
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código, cidade, estado, CNPJ ou regional..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
                {filteredStores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'Nenhuma loja encontrada' : 'Nenhuma loja cadastrada'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell className="font-mono font-medium">{store.code}</TableCell>
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
                          <Button size="icon" variant="ghost" onClick={() => handleEdit(store)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(store)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Loja</DialogTitle>
            <DialogDescription>Atualize as informações da loja</DialogDescription>
          </DialogHeader>
          <StoreForm isEdit />
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

      {/* Import Dialog */}
      <StoreImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
    </div>
  );
}
