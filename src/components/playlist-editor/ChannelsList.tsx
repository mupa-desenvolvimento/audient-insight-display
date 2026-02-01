import { useState } from "react";
import { PlaylistChannel, PlaylistChannelInsert } from "@/hooks/usePlaylistChannels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Clock, 
  Tv, 
  GripVertical, 
  Edit, 
  Trash2, 
  Play, 
  ChevronRight,
  Radio,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

interface ChannelFormData {
  name: string;
  description: string | null;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  is_fallback: boolean;
  is_active: boolean;
}

interface ChannelsListProps {
  channels: PlaylistChannel[];
  activeChannelId: string | null;
  onSelectChannel: (channel: PlaylistChannel) => void;
  onCreateChannel: (data: PlaylistChannelInsert) => void;
  onUpdateChannel: (id: string, data: Partial<PlaylistChannelInsert>) => void;
  onDeleteChannel: (id: string) => void;
  playlistId: string;
  playlistName: string;
}

export const ChannelsList = ({
  channels,
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  onUpdateChannel,
  onDeleteChannel,
  playlistId,
  playlistName,
}: ChannelsListProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<PlaylistChannel | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ChannelFormData>({
    name: "",
    description: null,
    start_time: "00:00",
    end_time: "23:59",
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    is_fallback: false,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: null,
      start_time: "00:00",
      end_time: "23:59",
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
      is_fallback: false,
      is_active: true,
    });
  };

  const openNewDialog = () => {
    resetForm();
    setEditingChannel(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (channel: PlaylistChannel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name,
      description: channel.description,
      start_time: channel.start_time.slice(0, 5),
      end_time: channel.end_time.slice(0, 5),
      days_of_week: channel.days_of_week,
      is_fallback: channel.is_fallback,
      is_active: channel.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    
    if (editingChannel) {
      onUpdateChannel(editingChannel.id, {
        name: formData.name,
        description: formData.description,
        start_time: formData.start_time,
        end_time: formData.end_time,
        days_of_week: formData.days_of_week,
        is_fallback: formData.is_fallback,
        is_active: formData.is_active,
      });
    } else {
      onCreateChannel({
        playlist_id: playlistId,
        name: formData.name,
        description: formData.description,
        start_time: formData.start_time,
        end_time: formData.end_time,
        days_of_week: formData.days_of_week,
        is_fallback: formData.is_fallback,
        is_active: formData.is_active,
        position: channels.length,
      });
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const toggleDayOfWeek = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day].sort(),
    }));
  };

  const isChannelActive = (channel: PlaylistChannel) => {
    if (!channel.is_active) return false;
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);
    
    if (!channel.days_of_week.includes(currentDay)) return false;
    
    const startTime = channel.start_time.slice(0, 5);
    const endTime = channel.end_time.slice(0, 5);
    
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }
    
    return currentTime >= startTime && currentTime <= endTime;
  };

  const getChannelStatusBadge = (channel: PlaylistChannel) => {
    if (!channel.is_active) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    if (channel.is_fallback) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Fallback</Badge>;
    }
    if (isChannelActive(channel)) {
      return <Badge className="bg-green-500">Ao Vivo</Badge>;
    }
    return <Badge variant="outline">Programado</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            Canais de Programação
          </h2>
          <p className="text-sm text-muted-foreground">
            Blocos de conteúdo por horário em "{playlistName}"
          </p>
        </div>
        <Button onClick={openNewDialog} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Novo Canal
        </Button>
      </div>

      {/* Channels List */}
      {channels.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Tv className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              Nenhum canal criado ainda. Crie seu primeiro canal para começar.
            </p>
            <Button onClick={openNewDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Canal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {channels.map((channel) => (
            <Card 
              key={channel.id}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50",
                activeChannelId === channel.id && "border-primary ring-1 ring-primary"
              )}
              onClick={() => onSelectChannel(channel)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Drag Handle */}
                  <div className="text-muted-foreground cursor-grab">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  
                  {/* Status Icon */}
                  <div className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    isChannelActive(channel) ? "bg-green-500/20" : "bg-muted"
                  )}>
                    {channel.is_fallback ? (
                      <Shield className="w-4 h-4 text-yellow-600" />
                    ) : isChannelActive(channel) ? (
                      <Play className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  
                  {/* Main Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Top Row: Badge + Time */}
                    <div className="flex items-center gap-3">
                      {getChannelStatusBadge(channel)}
                    </div>
                    
                    {/* Second Row: Time Range */}
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="font-medium">
                        {channel.start_time.slice(0, 5)} – {channel.end_time.slice(0, 5)}
                      </span>
                    </div>
                    
                    {/* Third Row: Days of Week with dots */}
                    <div className="flex items-center gap-1.5">
                      {DAYS_OF_WEEK.map((day) => (
                        <div key={day.value} className="flex flex-col items-center gap-0.5">
                          <span
                            className={cn(
                              "text-xs font-medium leading-none",
                              channel.days_of_week.includes(day.value)
                                ? "text-primary"
                                : "text-muted-foreground/40"
                            )}
                          >
                            {day.label[0]}
                          </span>
                          <div
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              channel.days_of_week.includes(day.value)
                                ? "bg-primary"
                                : "bg-muted-foreground/20"
                            )}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(channel);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(channel.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    <div className="flex flex-col items-center ml-1">
                      <span className="text-xs text-muted-foreground font-medium">
                        {channel.item_count || 0} mídias
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingChannel ? "Editar Canal" : "Novo Canal"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Canal *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Manhã, Almoço, Tarde..."
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição opcional do canal"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Início
                </Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Fim
                </Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dias da Semana</Label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((day) => (
                  <label
                    key={day.value}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg border cursor-pointer transition-colors",
                      formData.days_of_week.includes(day.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent"
                    )}
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

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Canal Fallback
                </Label>
                <p className="text-xs text-muted-foreground">
                  Exibido quando nenhum outro canal está ativo
                </p>
              </div>
              <Switch
                checked={formData.is_fallback}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_fallback: checked }))}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Canal ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
              {editingChannel ? "Salvar" : "Criar Canal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Canal</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este canal? Todo o conteúdo associado será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) onDeleteChannel(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
