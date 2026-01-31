import { useState, useEffect } from "react";
import { useDeviceGroups, DeviceGroupWithDetails, DeviceGroupInsert, DeviceGroupChannel } from "@/hooks/useDeviceGroups";
import { useChannels } from "@/hooks/useChannels";
import { useStores } from "@/hooks/useStores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Layers, Edit, Trash2, Monitor, Tv, AlertTriangle, Link2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const SCREEN_TYPES = [
  { value: "tv", label: "TV", icon: Tv },
  { value: "totem", label: "Totem", icon: Monitor },
  { value: "terminal", label: "Terminal", icon: Monitor },
];

const DeviceGroupsPage = () => {
  const {
    deviceGroups,
    isLoading,
    createDeviceGroup,
    updateDeviceGroup,
    deleteDeviceGroup,
    assignChannelToGroup,
    removeChannelFromGroup,
  } = useDeviceGroups();
  const { channels } = useChannels();
  const { stores } = useStores();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DeviceGroupWithDetails | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [channelDialogGroup, setChannelDialogGroup] = useState<DeviceGroupWithDetails | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");

  const [formData, setFormData] = useState<DeviceGroupInsert>({
    name: "",
    description: null,
    store_id: null,
    screen_type: "tv",
  });

  // Fetch group channels when dialog opens
  const { data: groupChannels = [] } = useQuery({
    queryKey: ["device-group-channels", channelDialogGroup?.id],
    queryFn: async () => {
      if (!channelDialogGroup) return [];
      const { data, error } = await supabase
        .from("device_group_channels")
        .select(`*, channel:distribution_channels(id, name, type)`)
        .eq("group_id", channelDialogGroup.id)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as DeviceGroupChannel[];
    },
    enabled: !!channelDialogGroup,
  });

  const filteredGroups = deviceGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.screen_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    createDeviceGroup.mutate(formData, {
      onSuccess: () => {
        setIsCreateOpen(false);
        resetForm();
      },
    });
  };

  const handleUpdate = () => {
    if (!editingGroup) return;
    updateDeviceGroup.mutate(
      { id: editingGroup.id, ...formData },
      {
        onSuccess: () => {
          setEditingGroup(null);
          resetForm();
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteDeviceGroup.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  };

  const handleAssignChannel = () => {
    if (!channelDialogGroup || !selectedChannelId) return;
    const position = groupChannels.length;
    assignChannelToGroup.mutate(
      { groupId: channelDialogGroup.id, channelId: selectedChannelId, position },
      {
        onSuccess: () => {
          setSelectedChannelId("");
          queryClient.invalidateQueries({ queryKey: ["device-group-channels", channelDialogGroup.id] });
        },
      }
    );
  };

  const handleRemoveChannel = (channelId: string) => {
    if (!channelDialogGroup) return;
    removeChannelFromGroup.mutate(
      { groupId: channelDialogGroup.id, channelId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["device-group-channels", channelDialogGroup.id] });
        },
      }
    );
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: null,
      store_id: null,
      screen_type: "tv",
    });
  };

  const openEdit = (group: DeviceGroupWithDetails) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description,
      store_id: group.store_id,
      screen_type: group.screen_type,
    });
  };

  const availableChannels = channels.filter(
    (c) => !groupChannels.some((gc) => gc.distribution_channel_id === c.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Grupos de Dispositivos</h1>
          <p className="text-muted-foreground">Organize dispositivos e atribua canais</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Grupo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do grupo"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do grupo"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Tela</Label>
                <Select
                  value={formData.screen_type}
                  onValueChange={(v) => setFormData({ ...formData, screen_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCREEN_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Loja (opcional)</Label>
                <Select
                  value={formData.store_id || "none"}
                  onValueChange={(v) => setFormData({ ...formData, store_id: v === "none" ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma loja" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (grupo global)</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name} ({store.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate} disabled={!formData.name}>
                  Criar
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar grupos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum grupo encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => {
            const screenType = SCREEN_TYPES.find((t) => t.value === group.screen_type);
            const ScreenIcon = screenType?.icon || Monitor;

            return (
              <Card key={group.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <ScreenIcon className="w-3 h-3" />
                      {screenType?.label}
                    </Badge>
                  </div>
                  <CardDescription>{group.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.store && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Loja:</span>
                      <Badge variant="secondary">
                        {group.store.name} ({group.store.code})
                      </Badge>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setChannelDialogGroup(group)}
                  >
                    <Link2 className="w-4 h-4 mr-2" />
                    Gerenciar Canais
                  </Button>

                  <div className="flex justify-end space-x-2 pt-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(group)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(group.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => !open && setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do grupo"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do grupo"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Tela</Label>
              <Select
                value={formData.screen_type}
                onValueChange={(v) => setFormData({ ...formData, screen_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCREEN_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Loja (opcional)</Label>
              <Select
                value={formData.store_id || "none"}
                onValueChange={(v) => setFormData({ ...formData, store_id: v === "none" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma loja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma (grupo global)</SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} ({store.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={handleUpdate} disabled={!formData.name}>
                Salvar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Channel Assignment Dialog */}
      <Dialog open={!!channelDialogGroup} onOpenChange={(open) => !open && setChannelDialogGroup(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Canais do Grupo: {channelDialogGroup?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedChannelId} onValueChange={setSelectedChannelId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione um canal" />
                </SelectTrigger>
                <SelectContent>
                  {availableChannels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAssignChannel} disabled={!selectedChannelId}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {groupChannels.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                Nenhum canal atribuído a este grupo
              </div>
            ) : (
              <div className="space-y-2">
                {groupChannels.map((gc, index) => (
                  <div
                    key={gc.id}
                    className="flex items-center justify-between p-2 rounded border bg-accent/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                      <span className="font-medium">{gc.channel?.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {gc.channel?.type}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveChannel(gc.distribution_channel_id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DeviceGroupsPage;
