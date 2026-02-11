import { useState } from 'react';
import { Users, UserPlus, Trash2, Shield, ShieldCheck, Search, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useUserTenantMappings, UserTenantMapping } from '@/hooks/useUserTenantMappings';
import { Tenant } from '@/hooks/useTenants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TenantUsersDialogProps {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TenantUsersDialog({ tenant, open, onOpenChange }: TenantUsersDialogProps) {
  const { mappings, availableUsers, isLoading, addUserToTenant, removeUserFromTenant, toggleTenantAdmin } = useUserTenantMappings(tenant?.id);
  
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [selectedMapping, setSelectedMapping] = useState<UserTenantMapping | null>(null);
  const [isRemoveOpen, setIsRemoveOpen] = useState(false);
  const [addAsAdmin, setAddAsAdmin] = useState(false);

  const filteredMappings = mappings.filter(mapping =>
    mapping.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mapping.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAvailableUsers = availableUsers.filter(user =>
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const handleAddUser = async (userId: string) => {
    try {
      await addUserToTenant(userId, addAsAdmin);
      setIsAddUserOpen(false);
      setUserSearchTerm('');
      setAddAsAdmin(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleRemoveUser = async () => {
    if (!selectedMapping) return;
    try {
      await removeUserFromTenant(selectedMapping.id);
      setIsRemoveOpen(false);
      setSelectedMapping(null);
    } catch {
      // Error handled in hook
    }
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || '??';
  };

  if (!tenant) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários - {tenant.name}
            </DialogTitle>
            <DialogDescription>
              Gerencie os usuários associados a este cliente
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-4 py-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setIsAddUserOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>

          <div className="flex-1 overflow-auto border rounded-md">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredMappings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum usuário associado</p>
                <p className="text-sm text-muted-foreground">
                  Clique em "Adicionar" para associar usuários a este tenant.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Admin do Tenant</TableHead>
                    <TableHead>Associado em</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMappings.map(mapping => (
                    <TableRow key={mapping.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={mapping.user?.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(mapping.user?.full_name, mapping.user?.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {mapping.user?.full_name || '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {mapping.user?.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={mapping.is_tenant_admin || false}
                            onCheckedChange={(checked) => toggleTenantAdmin(mapping.id, checked)}
                          />
                          {mapping.is_tenant_admin && (
                            <Badge variant="secondary" className="gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              Admin
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {mapping.created_at 
                          ? format(new Date(mapping.created_at), "dd/MM/yyyy", { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedMapping(mapping);
                            setIsRemoveOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {mappings.length} usuário(s) associado(s)
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Usuário</DialogTitle>
            <DialogDescription>
              Selecione um usuário para associar ao tenant "{tenant.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="add-as-admin"
                checked={addAsAdmin}
                onCheckedChange={setAddAsAdmin}
              />
              <Label htmlFor="add-as-admin" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Adicionar como Admin do Tenant
              </Label>
            </div>

            <div className="max-h-64 overflow-auto border rounded-md">
              {filteredAvailableUsers.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {userSearchTerm 
                      ? 'Nenhum usuário encontrado' 
                      : 'Todos os usuários já estão associados'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredAvailableUsers.map(user => (
                    <button
                      key={user.id}
                      className="w-full p-3 text-left hover:bg-accent transition-colors flex items-center gap-3"
                      onClick={() => handleAddUser(user.id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {getInitials(user.full_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {user.full_name || 'Sem nome'}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={isRemoveOpen} onOpenChange={setIsRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{selectedMapping?.user?.email}</strong> do tenant <strong>{tenant.name}</strong>?
              <br /><br />
              O usuário perderá acesso a todos os dados deste cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedMapping(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
