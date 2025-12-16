import { useState, useEffect } from 'react';
import { Users, Search, Mail, Building2, Shield, ShieldCheck, Trash2, UserPlus, Loader2, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tenant } from '@/hooks/useTenants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserWithMappings {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  mappings: {
    id: string;
    tenant_id: string;
    tenant_name: string;
    is_tenant_admin: boolean | null;
    created_at: string | null;
  }[];
}

interface TenantUsersListProps {
  tenants: Tenant[];
}

export function TenantUsersList({ tenants }: TenantUsersListProps) {
  const [users, setUsers] = useState<UserWithMappings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTenant, setFilterTenant] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithMappings | null>(null);
  const [selectedMapping, setSelectedMapping] = useState<{ id: string; tenantName: string } | null>(null);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    password: '',
    full_name: '',
    tenant_id: '',
    is_tenant_admin: false
  });

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('email');

      if (profilesError) throw profilesError;

      // Fetch all mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('user_tenant_mappings')
        .select('*');

      if (mappingsError) throw mappingsError;

      // Combine data
      const usersWithMappings: UserWithMappings[] = (profiles || []).map(profile => ({
        ...profile,
        mappings: (mappings || [])
          .filter(m => m.user_id === profile.id)
          .map(m => {
            const tenant = tenants.find(t => t.id === m.tenant_id);
            return {
              id: m.id,
              tenant_id: m.tenant_id,
              tenant_name: tenant?.name || 'Tenant não encontrado',
              is_tenant_admin: m.is_tenant_admin,
              created_at: m.created_at
            };
          })
      }));

      setUsers(usersWithMappings);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [tenants]);

  const handleAddMapping = async (userId: string, tenantId: string) => {
    try {
      const { error } = await supabase
        .from('user_tenant_mappings')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          is_tenant_admin: false
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Usuário já está associado a este tenant');
        } else {
          throw error;
        }
        return;
      }

      await fetchUsers();
      toast.success('Usuário associado ao tenant');
    } catch (error) {
      console.error('Error adding mapping:', error);
      toast.error('Erro ao associar usuário');
    }
  };

  const handleRemoveMapping = async () => {
    if (!selectedMapping) return;
    
    try {
      const { error } = await supabase
        .from('user_tenant_mappings')
        .delete()
        .eq('id', selectedMapping.id);

      if (error) throw error;

      await fetchUsers();
      setIsRemoveOpen(false);
      setSelectedMapping(null);
      toast.success('Usuário removido do tenant');
    } catch (error) {
      console.error('Error removing mapping:', error);
      toast.error('Erro ao remover associação');
    }
  };

  const handleToggleAdmin = async (mappingId: string, isAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('user_tenant_mappings')
        .update({ is_tenant_admin: isAdmin })
        .eq('id', mappingId);

      if (error) throw error;

      await fetchUsers();
      toast.success(isAdmin ? 'Usuário promovido a admin' : 'Admin removido');
    } catch (error) {
      console.error('Error updating admin status:', error);
      toast.error('Erro ao atualizar permissão');
    }
  };

  const resetNewUserForm = () => {
    setNewUserForm({
      email: '',
      password: '',
      full_name: '',
      tenant_id: '',
      is_tenant_admin: false
    });
    setShowPassword(false);
  };

  const handleCreateUser = async () => {
    if (!newUserForm.email || !newUserForm.password) {
      toast.error('Email e senha são obrigatórios');
      return;
    }

    if (newUserForm.password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    try {
      setIsCreating(true);
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserForm.email.trim(),
          password: newUserForm.password,
          full_name: newUserForm.full_name.trim() || null,
          tenant_id: newUserForm.tenant_id || null,
          is_tenant_admin: newUserForm.is_tenant_admin
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      if (response.data?.warning) {
        toast.warning(response.data.warning);
      } else {
        toast.success('Usuário criado com sucesso');
      }

      setIsCreateOpen(false);
      resetNewUserForm();
      await fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setIsCreating(false);
    }
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || '??';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterTenant === 'all') return matchesSearch;
    if (filterTenant === 'unassigned') return matchesSearch && user.mappings.length === 0;
    return matchesSearch && user.mappings.some(m => m.tenant_id === filterTenant);
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterTenant} onValueChange={setFilterTenant}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filtrar por tenant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os usuários</SelectItem>
            <SelectItem value="unassigned">Sem tenant</SelectItem>
            {tenants.map(tenant => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setIsCreateOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{users.length} usuários cadastrados</span>
        <span>•</span>
        <span>{users.filter(u => u.mappings.length > 0).length} com tenant</span>
        <span>•</span>
        <span>{users.filter(u => u.mappings.length === 0).length} sem tenant</span>
      </div>

      {/* Table */}
      <div className="border rounded-md">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhum usuário encontrado</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Tente ajustar sua busca.' : 'Não há usuários cadastrados.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tenants Associados</TableHead>
                <TableHead>Cadastrado em</TableHead>
                <TableHead className="w-[200px]">Vincular a Tenant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.full_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {user.full_name || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.mappings.length === 0 ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        Sem tenant
                      </Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {user.mappings.map(mapping => (
                          <div key={mapping.id} className="flex items-center gap-1">
                            <Badge variant="secondary" className="gap-1 pr-1">
                              <Building2 className="h-3 w-3" />
                              {mapping.tenant_name}
                              {mapping.is_tenant_admin && (
                                <ShieldCheck className="h-3 w-3 text-primary ml-1" />
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                                onClick={() => {
                                  setSelectedMapping({ id: mapping.id, tenantName: mapping.tenant_name });
                                  setSelectedUser(user);
                                  setIsRemoveOpen(true);
                                }}
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </Badge>
                            <Switch
                              checked={mapping.is_tenant_admin || false}
                              onCheckedChange={(checked) => handleToggleAdmin(mapping.id, checked)}
                              className="scale-75"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Select
                      value=""
                      onValueChange={(tenantId) => handleAddMapping(user.id, tenantId)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Selecionar tenant..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tenants
                          .filter(t => !user.mappings.some(m => m.tenant_id === t.id))
                          .map(tenant => (
                            <SelectItem key={tenant.id} value={tenant.id}>
                              {tenant.name}
                            </SelectItem>
                          ))
                        }
                        {tenants.filter(t => !user.mappings.some(m => m.tenant_id === t.id)).length === 0 && (
                          <SelectItem value="none" disabled>
                            Todos os tenants já associados
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Remove Confirmation */}
      <AlertDialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Associação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{selectedUser?.email}</strong> do tenant <strong>{selectedMapping?.tenantName}</strong>?
              <br /><br />
              O usuário perderá acesso a todos os dados deste cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setSelectedMapping(null); setSelectedUser(null); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveMapping} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetNewUserForm(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Novo Usuário
            </DialogTitle>
            <DialogDescription>
              Cadastre um novo usuário no sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Nome Completo</Label>
              <Input
                id="new-user-name"
                value={newUserForm.full_name}
                onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                placeholder="João da Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-user-email">Email *</Label>
              <Input
                id="new-user-email"
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                placeholder="joao@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-user-password">Senha *</Label>
              <div className="relative">
                <Input
                  id="new-user-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-user-tenant">Vincular a Cliente (opcional)</Label>
              <Select
                value={newUserForm.tenant_id || 'none'}
                onValueChange={(value) => setNewUserForm({ ...newUserForm, tenant_id: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {tenants.map(tenant => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {newUserForm.tenant_id && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="new-user-admin"
                  checked={newUserForm.is_tenant_admin}
                  onCheckedChange={(checked) => setNewUserForm({ ...newUserForm, is_tenant_admin: checked })}
                />
                <Label htmlFor="new-user-admin" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin do Cliente
                </Label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetNewUserForm(); }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={!newUserForm.email || !newUserForm.password || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Usuário'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
