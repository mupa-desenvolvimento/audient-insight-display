import { useState } from 'react';
import { useStores } from '@/hooks/useStores';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Upload, Store, MapPin, Edit, Trash2, Loader2 } from 'lucide-react';
import { StoreWithHierarchy } from '@/types/database';
import { toast } from 'sonner';
import { StoreImportDialog } from '@/components/stores/StoreImportDialog';

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
  });

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.city?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.city?.state?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({ code: '', name: '', city_id: '', address: '' });
  };

  const handleCreate = async () => {
    if (!formData.code || !formData.name || !formData.city_id) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSubmitting(true);
    try {
      await createStore({
        code: formData.code,
        name: formData.name,
        city_id: formData.city_id,
        address: formData.address || null,
        is_active: true,
        metadata: {},
      });
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      // Error handled in hook
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
      await updateStore(selectedStore.id, {
        code: formData.code,
        name: formData.name,
        city_id: formData.city_id,
        address: formData.address || null,
      });
      setIsEditOpen(false);
      setSelectedStore(null);
      resetForm();
    } catch (error) {
      // Error handled in hook
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lojas</h1>
          <p className="text-muted-foreground">Gerencie todas as lojas do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Loja
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Loja</DialogTitle>
                <DialogDescription>Adicione uma nova loja ao sistema</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código *</Label>
                  <Input
                    id="code"
                    placeholder="Ex: LJ001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Nome da loja"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade *</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    placeholder="Endereço completo"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>
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
                placeholder="Buscar por nome, código, cidade ou estado..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
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
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="text-sm">
                          {store.city?.name}, {store.city?.state?.code} - {store.city?.state?.region?.name}
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
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Loja</DialogTitle>
            <DialogDescription>Atualize as informações da loja</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-code">Código *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-city">Cidade *</Label>
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
            <div className="space-y-2">
              <Label htmlFor="edit-address">Endereço</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>
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
