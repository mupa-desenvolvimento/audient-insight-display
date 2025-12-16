import { useState } from 'react';
import { Building2, Plus, Search, Power, PowerOff, Trash2, Edit, Users, Monitor, Store as StoreIcon, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useTenants, Tenant } from '@/hooks/useTenants';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Tenants = () => {
  const { tenants, isLoading, createTenant, updateTenant, toggleTenantStatus, deleteTenant } = useTenants();
  const { isSuperAdmin, isLoading: isCheckingAdmin } = useSuperAdmin();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    max_users: 50,
    max_devices: 100,
    max_stores: 500,
  });

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      max_users: 50,
      max_devices: 100,
      max_stores: 500,
    });
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.slug) return;
    
    try {
      await createTenant(formData);
      setIsCreateOpen(false);
      resetForm();
    } catch {
      // Error handled in hook
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      max_users: tenant.max_users || 50,
      max_devices: tenant.max_devices || 100,
      max_stores: tenant.max_stores || 500,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedTenant) return;
    
    try {
      await updateTenant(selectedTenant.id, {
        name: formData.name,
        max_users: formData.max_users,
        max_devices: formData.max_devices,
        max_stores: formData.max_stores,
      });
      setIsEditOpen(false);
      setSelectedTenant(null);
      resetForm();
    } catch {
      // Error handled in hook
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTenant) return;
    
    try {
      await deleteTenant(selectedTenant.id);
      setIsDeleteOpen(false);
      setSelectedTenant(null);
    } catch {
      // Error handled in hook
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  if (isCheckingAdmin || isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Acesso Restrito</h2>
        <p className="text-muted-foreground">Apenas Super Admins podem acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Clientes (Tenants)
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerenciamento de clientes multi-tenant
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <Power className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {tenants.filter(t => t.is_active !== false).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <PowerOff className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {tenants.filter(t => t.is_active === false).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Schemas Ativos</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenants.filter(t => (t.migration_version || 0) > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tenants Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTenants.map(tenant => (
          <Card key={tenant.id} className={`transition-all ${tenant.is_active === false ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">{tenant.name}</CardTitle>
                <Badge variant={tenant.is_active !== false ? 'default' : 'secondary'}>
                  {tenant.is_active !== false ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-mono">{tenant.slug}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{tenant.max_users || 50}</p>
                  <p className="text-xs text-muted-foreground">Usuários</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{tenant.max_devices || 100}</p>
                  <p className="text-xs text-muted-foreground">Dispositivos</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <StoreIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">{tenant.max_stores || 500}</p>
                  <p className="text-xs text-muted-foreground">Lojas</p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>Schema: <span className="font-mono">{tenant.schema_name}</span></p>
                <p>Criado: {tenant.created_at ? format(new Date(tenant.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(tenant)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant={tenant.is_active !== false ? 'outline' : 'default'}
                  size="sm"
                  onClick={() => toggleTenantStatus(tenant.id, tenant.is_active === false)}
                >
                  {tenant.is_active !== false ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setIsDeleteOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">Nenhum cliente encontrado</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Tente ajustar sua busca.' : 'Crie seu primeiro cliente para começar.'}
          </p>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Crie um novo cliente (tenant) no sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Cliente</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    name: e.target.value,
                    slug: generateSlug(e.target.value)
                  });
                }}
                placeholder="Ex: Empresa ABC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (identificador único)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="empresa-abc"
                className="font-mono"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_users">Max Usuários</Label>
                <Input
                  id="max_users"
                  type="number"
                  value={formData.max_users}
                  onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 50 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_devices">Max Devices</Label>
                <Input
                  id="max_devices"
                  type="number"
                  value={formData.max_devices}
                  onChange={(e) => setFormData({ ...formData, max_devices: parseInt(e.target.value) || 100 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_stores">Max Lojas</Label>
                <Input
                  id="max_stores"
                  type="number"
                  value={formData.max_stores}
                  onChange={(e) => setFormData({ ...formData, max_stores: parseInt(e.target.value) || 500 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name || !formData.slug}>
              Criar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize as informações do cliente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome do Cliente</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug (não editável)</Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                disabled
                className="font-mono bg-muted"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-max_users">Max Usuários</Label>
                <Input
                  id="edit-max_users"
                  type="number"
                  value={formData.max_users}
                  onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 50 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max_devices">Max Devices</Label>
                <Input
                  id="edit-max_devices"
                  type="number"
                  value={formData.max_devices}
                  onChange={(e) => setFormData({ ...formData, max_devices: parseInt(e.target.value) || 100 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max_stores">Max Lojas</Label>
                <Input
                  id="edit-max_stores"
                  type="number"
                  value={formData.max_stores}
                  onChange={(e) => setFormData({ ...formData, max_stores: parseInt(e.target.value) || 500 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); setSelectedTenant(null); resetForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{selectedTenant?.name}</strong>?
              Esta ação irá remover permanentemente o schema e todos os dados associados.
              <br /><br />
              <span className="text-destructive font-semibold">Esta ação não pode ser desfeita!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTenant(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Tenants;
