import { useState, useMemo } from "react";
import { useMediaItems, MediaItem } from "@/hooks/useMediaItems";
import { Channel } from "@/hooks/useChannels";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Image, 
  Video, 
  FileText, 
  Clock,
  Calendar,
  Zap,
  Monitor,
  X,
  GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface EditorPropertiesPanelProps {
  activePanel: "media" | "settings";
  formData: PlaylistFormData;
  channels: Channel[];
  itemCount: number;
  totalDuration: number;
  connectedDevicesCount: number;
  onFormChange: (updates: Partial<PlaylistFormData>) => void;
  onAddMedia: (media: MediaItem, position: number) => void;
  itemsLength: number;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "D" },
  { value: 1, label: "S" },
  { value: 2, label: "T" },
  { value: 3, label: "Q" },
  { value: 4, label: "Q" },
  { value: 5, label: "S" },
  { value: 6, label: "S" },
];

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

const getMediaIcon = (type: string) => {
  switch (type) {
    case "video": return Video;
    case "image": return Image;
    default: return FileText;
  }
};

const MediaLibraryPanel = ({ onAddMedia, itemsLength }: { 
  onAddMedia: (media: MediaItem, position: number) => void;
  itemsLength: number;
}) => {
  const { mediaItems, isLoading } = useMediaItems();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredItems = useMemo(() => {
    return mediaItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const isActive = item.status === "active";
      return matchesSearch && matchesType && isActive;
    });
  }, [mediaItems, search, typeFilter]);

  const handleDragStart = (e: React.DragEvent, media: MediaItem) => {
    e.dataTransfer.setData("application/json", JSON.stringify(media));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Search & Filter */}
      <div className="p-3 space-y-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar mídia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        <div className="flex gap-1">
          {[
            { value: "all", label: "Todos" },
            { value: "image", label: "Imagens" },
            { value: "video", label: "Vídeos" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setTypeFilter(filter.value)}
              className={cn(
                "flex-1 h-7 text-xs rounded transition-colors",
                typeFilter === filter.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Media Grid - Scroll local com scrollbar sempre visível */}
      <ScrollArea className="flex-1 min-h-0" showScrollbar="always">
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">Nenhuma mídia</div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-3">
            {filteredItems.map((media) => {
              const Icon = getMediaIcon(media.type);
              
              return (
                <div
                  key={media.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, media)}
                  className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-primary/50 transition-all"
                >
                  {media.file_url ? (
                    media.type === "video" ? (
                      <video
                        src={media.file_url}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={media.file_url}
                        alt={media.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Icon className="w-8 h-8" />
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] text-white truncate">{media.name}</p>
                    <div className="flex items-center gap-1 text-[9px] text-white/60">
                      <Icon className="w-2.5 h-2.5" />
                      <span>{formatDuration(media.duration || 10)}</span>
                    </div>
                  </div>

                  {/* Drag indicator */}
                  <div className="absolute top-1 right-1 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-3 h-3 text-white/70" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Arraste para adicionar à timeline
        </p>
      </div>
    </div>
  );
};

const SettingsPanel = ({
  formData,
  channels,
  itemCount,
  totalDuration,
  connectedDevicesCount,
  onFormChange,
}: {
  formData: PlaylistFormData;
  channels: Channel[];
  itemCount: number;
  totalDuration: number;
  connectedDevicesCount: number;
  onFormChange: (updates: Partial<PlaylistFormData>) => void;
}) => {
  const toggleDayOfWeek = (day: number) => {
    const newDays = formData.days_of_week.includes(day)
      ? formData.days_of_week.filter((d) => d !== day)
      : [...formData.days_of_week, day].sort();
    onFormChange({ days_of_week: newDays });
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-muted text-center">
            <p className="text-lg font-semibold">{itemCount}</p>
            <p className="text-[10px] text-muted-foreground">Itens</p>
          </div>
          <div className="p-3 rounded-lg bg-muted text-center">
            <p className="text-lg font-semibold">{formatDuration(totalDuration)}</p>
            <p className="text-[10px] text-muted-foreground">Duração</p>
          </div>
          <div className="p-3 rounded-lg bg-muted text-center">
            <p className="text-lg font-semibold">{connectedDevicesCount}</p>
            <p className="text-[10px] text-muted-foreground">Devices</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nome do Projeto</Label>
            <Input
              value={formData.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
              placeholder="Nome da playlist"
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Descrição</Label>
            <Textarea
              value={formData.description || ""}
              onChange={(e) => onFormChange({ description: e.target.value || null })}
              placeholder="Opcional"
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Canal</Label>
            <Select
              value={formData.channel_id || "none"}
              onValueChange={(v) => onFormChange({ channel_id: v === "none" ? null : v })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione" />
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
        </div>

        {/* Schedule */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>Programação</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Início</Label>
              <Input
                type="date"
                value={formData.start_date || ""}
                onChange={(e) => onFormChange({ start_date: e.target.value || null })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Fim</Label>
              <Input
                type="date"
                value={formData.end_date || ""}
                onChange={(e) => onFormChange({ end_date: e.target.value || null })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground">Dias da Semana</Label>
            <div className="flex gap-1">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleDayOfWeek(day.value)}
                  className={cn(
                    "flex-1 h-8 rounded text-xs font-medium transition-colors",
                    formData.days_of_week.includes(day.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Horário Início
              </Label>
              <Input
                type="time"
                value={formData.start_time}
                onChange={(e) => onFormChange({ start_time: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Horário Fim
              </Label>
              <Input
                type="time"
                value={formData.end_time}
                onChange={(e) => onFormChange({ end_time: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Priority & Status */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Prioridade (1-10)
            </Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={formData.priority}
              onChange={(e) => onFormChange({ priority: parseInt(e.target.value) || 5 })}
              className="h-9 text-sm"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
            <div>
              <p className="text-sm font-medium">Ativa</p>
              <p className="text-[10px] text-muted-foreground">Exibir nos dispositivos</p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => onFormChange({ is_active: checked })}
            />
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

export const EditorPropertiesPanel = ({
  activePanel,
  formData,
  channels,
  itemCount,
  totalDuration,
  connectedDevicesCount,
  onFormChange,
  onAddMedia,
  itemsLength,
}: EditorPropertiesPanelProps) => {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Panel Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-border shrink-0">
        <span className="text-xs font-medium text-muted-foreground">
          {activePanel === "media" ? "Biblioteca de Mídias" : "Configurações"}
        </span>
      </div>

      {/* Panel Content - Scrollable */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activePanel === "media" ? (
          <MediaLibraryPanel onAddMedia={onAddMedia} itemsLength={itemsLength} />
        ) : (
          <SettingsPanel
            formData={formData}
            channels={channels}
            itemCount={itemCount}
            totalDuration={totalDuration}
            connectedDevicesCount={connectedDevicesCount}
            onFormChange={onFormChange}
          />
        )}
      </div>
    </div>
  );
};
