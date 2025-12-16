import { useState } from "react";
import { useChannels, Channel, ChannelInsert } from "@/hooks/useChannels";
import { usePlaylists } from "@/hooks/usePlaylists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Tv, Edit, Trash2, ListVideo, AlertTriangle } from "lucide-react";

const CHANNEL_TYPES = [
  { value: "promocao", label: "Promoção" },
  { value: "institucional", label: "Institucional" },
  { value: "noticias", label: "Notícias" },
  { value: "clima", label: "Clima" },
  { value: "dicas", label: "Dicas" },
  { value: "avisos", label: "Avisos" },
  { value: "custom", label: "Personalizado" },
];

const ChannelsPage = () => {
  const { channels, isLoading, createChannel, updateChannel, deleteChannel } = useChannels();
  const { playlists } = usePlaylists();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<ChannelInsert>({
    name: "",
    description: "",
    type: "custom",
    priority: 5,
    is_active: true,
  });

  const filteredChannels = channels.filter(
    (channel) =>
      channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      channel.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    createChannel.mutate(formData, {
      onSuccess: () => {
        setIsCreateOpen(false);
        resetForm();
      },
    });
  };

  const handleUpdate = () => {
    if (!editingChannel) return;
    updateChannel.mutate(
      { id: editingChannel.id, ...formData },
      {
        onSuccess: () => {
          setEditingChannel(null);
          resetForm();
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteChannel.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      type: "custom",
      priority: 5,
      is_active: true,
    });
  };

  const openEdit = (channel: Channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      description: channel.description || "",
      type: channel.type,
      priority: channel.priority,
      is_active: channel.is_active,
    });
  };

  const getChannelPlaylists = (channelId: string) => {
    return playlists.filter((p) => p.channel_id === channelId);
  };

  const getChannelStatus = (channel: Channel) => {
    const channelPlaylists = getChannelPlaylists(channel.id);
    if (channelPlaylists.length === 0) {
      return { status: "warning", message: "Sem playlists" };
    }
    const activePlaylists = channelPlaylists.filter((p) => p.is_active);
    if (activePlaylists.length === 0) {
      return { status: "error", message: "Nenhuma playlist ativa" };
    }
    return { status: "success", message: `${activePlaylists.length} playlist(s) ativa(s)` };
  };

  const ChannelForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nome *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Nome do canal"
        />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição do canal"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prioridade (1-10)</Label>
          <Input
            type="number"
            min={1}
            max={10}
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 5 })}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label>Canal ativo</Label>
      </div>
      <DialogFooter>
        <Button onClick={onSubmit} disabled={!formData.name}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Canais</h1>
          <p className="text-muted-foreground">Gerencie os canais de conteúdo</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Canal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Canal</DialogTitle>
            </DialogHeader>
            <ChannelForm onSubmit={handleCreate} submitLabel="Criar" />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar canais..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filteredChannels.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum canal encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChannels.map((channel) => {
            const status = getChannelStatus(channel);
            const playlistCount = getChannelPlaylists(channel.id).length;

            return (
              <Card key={channel.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Tv className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{channel.name}</CardTitle>
                    </div>
                    <Badge variant={channel.is_active ? "default" : "secondary"}>
                      {channel.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <CardDescription>{channel.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tipo:</span>
                    <Badge variant="outline">
                      {CHANNEL_TYPES.find((t) => t.value === channel.type)?.label || channel.type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Prioridade:</span>
                    <span>{channel.priority}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <ListVideo className="w-4 h-4" />
                      Playlists:
                    </span>
                    <span>{playlistCount}</span>
                  </div>

                  {status.status !== "success" && (
                    <div
                      className={`flex items-center gap-2 p-2 rounded text-sm ${
                        status.status === "error"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-yellow-500/10 text-yellow-600"
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                      {status.message}
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(channel)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(channel.id)}>
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
      <Dialog open={!!editingChannel} onOpenChange={(open) => !open && setEditingChannel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Canal</DialogTitle>
          </DialogHeader>
          <ChannelForm onSubmit={handleUpdate} submitLabel="Salvar" />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Canal</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este canal? Esta ação não pode ser desfeita.
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

export default ChannelsPage;
