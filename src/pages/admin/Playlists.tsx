import { useState } from "react";
import { usePlaylists, PlaylistWithChannel } from "@/hooks/usePlaylists";
import { useChannels } from "@/hooks/useChannels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, ListVideo, Edit, Trash2, Calendar, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const DAYS_OF_WEEK = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

interface PlaylistFormData {
  name: string;
  description: string | null;
  channel_id: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  priority: number;
}

const PlaylistsPage = () => {
  const { playlists, isLoading, createPlaylist, updatePlaylist, deletePlaylist } = usePlaylists();
  const { channels } = useChannels();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<PlaylistWithChannel | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<PlaylistFormData>({
    name: "",
    description: null,
    channel_id: null,
    is_active: true,
    start_date: null,
    end_date: null,
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    start_time: "00:00",
    end_time: "23:59",
    priority: 5,
  });

  const filteredPlaylists = playlists.filter(
    (playlist) =>
      playlist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      playlist.channel?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    const schedule = {
      start_date: formData.start_date,
      end_date: formData.end_date,
      days_of_week: formData.days_of_week,
      start_time: formData.start_time,
      end_time: formData.end_time,
      priority: formData.priority,
    };

    createPlaylist.mutate(
      {
        name: formData.name,
        description: formData.description,
        channel_id: formData.channel_id,
        is_active: formData.is_active,
        schedule,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!editingPlaylist) return;

    const schedule = {
      start_date: formData.start_date,
      end_date: formData.end_date,
      days_of_week: formData.days_of_week,
      start_time: formData.start_time,
      end_time: formData.end_time,
      priority: formData.priority,
    };

    updatePlaylist.mutate(
      {
        id: editingPlaylist.id,
        name: formData.name,
        description: formData.description,
        channel_id: formData.channel_id,
        is_active: formData.is_active,
        schedule,
      },
      {
        onSuccess: () => {
          setEditingPlaylist(null);
          resetForm();
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deletePlaylist.mutate(deleteId, {
      onSuccess: () => setDeleteId(null),
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: null,
      channel_id: null,
      is_active: true,
      start_date: null,
      end_date: null,
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      start_time: "00:00",
      end_time: "23:59",
      priority: 5,
    });
  };

  const openEdit = (playlist: PlaylistWithChannel) => {
    const schedule = playlist.schedule as Record<string, unknown> | null;
    setEditingPlaylist(playlist);
    setFormData({
      name: playlist.name,
      description: playlist.description,
      channel_id: playlist.channel_id,
      is_active: playlist.is_active,
      start_date: (schedule?.start_date as string) || null,
      end_date: (schedule?.end_date as string) || null,
      days_of_week: (schedule?.days_of_week as number[]) || [0, 1, 2, 3, 4, 5, 6],
      start_time: (schedule?.start_time as string) || "00:00",
      end_time: (schedule?.end_time as string) || "23:59",
      priority: (schedule?.priority as number) || 5,
    });
  };

  const toggleDayOfWeek = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day].sort(),
    }));
  };

  const getPlaylistStatus = (playlist: PlaylistWithChannel) => {
    const schedule = playlist.schedule as Record<string, unknown> | null;
    const now = new Date();

    if (!playlist.is_active) {
      return { status: "inactive", message: "Inativa", color: "secondary" };
    }

    if (schedule?.end_date) {
      const endDate = parseISO(schedule.end_date as string);
      if (isBefore(endDate, now)) {
        return { status: "expired", message: "Expirada", color: "destructive" };
      }
      if (isBefore(endDate, addDays(now, 3))) {
        return { status: "expiring", message: "Expira em breve", color: "warning" };
      }
    }

    if (schedule?.start_date) {
      const startDate = parseISO(schedule.start_date as string);
      if (isAfter(startDate, now)) {
        return { status: "scheduled", message: "Agendada", color: "outline" };
      }
    }

    return { status: "active", message: "Ativa", color: "default" };
  };

  const PlaylistForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label>Nome *</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Nome da playlist"
        />
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição da playlist"
        />
      </div>

      <div className="space-y-2">
        <Label>Canal</Label>
        <Select
          value={formData.channel_id || "none"}
          onValueChange={(v) => setFormData({ ...formData, channel_id: v === "none" ? null : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Nenhum</SelectItem>
            {channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                {channel.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Programação
        </h4>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={formData.start_date || ""}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value || null })}
            />
          </div>
          <div className="space-y-2">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={formData.end_date || ""}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Dias da Semana</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => (
              <label
                key={day.value}
                className={`flex items-center justify-center w-10 h-10 rounded-lg border cursor-pointer transition-colors ${
                  formData.days_of_week.includes(day.value)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent"
                }`}
              >
                <Checkbox
                  checked={formData.days_of_week.includes(day.value)}
                  onCheckedChange={() => toggleDayOfWeek(day.value)}
                  className="sr-only"
                />
                <span className="text-xs font-medium">{day.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Horário Início
            </Label>
            <Input
              type="time"
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Horário Fim
            </Label>
            <Input
              type="time"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </div>
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
        <Label>Playlist ativa</Label>
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
          <h1 className="text-3xl font-bold">Playlists</h1>
          <p className="text-muted-foreground">Gerencie as playlists e programação de conteúdo</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Playlist</DialogTitle>
            </DialogHeader>
            <PlaylistForm onSubmit={handleCreate} submitLabel="Criar" />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar playlists..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filteredPlaylists.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma playlist encontrada
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlaylists.map((playlist) => {
            const status = getPlaylistStatus(playlist);
            const schedule = playlist.schedule as Record<string, unknown> | null;

            return (
              <Card key={playlist.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <ListVideo className="w-5 h-5 text-primary" />
                      <CardTitle className="text-lg">{playlist.name}</CardTitle>
                    </div>
                    <Badge
                      variant={status.color as "default" | "secondary" | "destructive" | "outline"}
                      className={status.status === "expiring" ? "bg-yellow-500 text-white" : ""}
                    >
                      {status.message}
                    </Badge>
                  </div>
                  <CardDescription>{playlist.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {playlist.channel && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Canal:</span>
                      <Badge variant="outline">{playlist.channel.name}</Badge>
                    </div>
                  )}

                  {schedule && (
                    <>
                      {schedule.start_date && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Período:</span>
                          <span>
                            {format(parseISO(schedule.start_date as string), "dd/MM/yyyy", { locale: ptBR })}
                            {schedule.end_date &&
                              ` - ${format(parseISO(schedule.end_date as string), "dd/MM/yyyy", { locale: ptBR })}`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Horário:</span>
                        <span>
                          {schedule.start_time as string} - {schedule.end_time as string}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Dias:</span>
                        <div className="flex gap-1">
                          {DAYS_OF_WEEK.map((day) => (
                            <span
                              key={day.value}
                              className={`text-xs px-1 rounded ${
                                (schedule.days_of_week as number[])?.includes(day.value)
                                  ? "bg-primary/20 text-primary"
                                  : "text-muted-foreground/50"
                              }`}
                            >
                              {day.label[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {status.status === "expiring" && (
                    <div className="flex items-center gap-2 p-2 rounded bg-yellow-500/10 text-yellow-600 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Playlist expira em breve
                    </div>
                  )}

                  {status.status === "expired" && (
                    <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Playlist expirada
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 pt-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(playlist)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(playlist.id)}>
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
      <Dialog open={!!editingPlaylist} onOpenChange={(open) => !open && setEditingPlaylist(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Playlist</DialogTitle>
          </DialogHeader>
          <PlaylistForm onSubmit={handleUpdate} submitLabel="Salvar" />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Playlist</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta playlist? Esta ação não pode ser desfeita.
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

export default PlaylistsPage;
