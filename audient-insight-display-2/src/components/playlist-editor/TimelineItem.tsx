import { useState } from "react";
import { PlaylistItem } from "@/hooks/usePlaylistItems";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Image, 
  Video, 
  FileText, 
  GripVertical, 
  X, 
  Copy, 
  Clock,
  AlertTriangle,
  MoreVertical,
  Settings,
  Calendar
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TimelineItemProps {
  item: PlaylistItem;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onDurationChange: (duration: number) => void;
  onOpenSettings: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

const getMediaIcon = (type: string) => {
  switch (type) {
    case "video":
      return <Video className="w-3 h-3" />;
    case "image":
      return <Image className="w-3 h-3" />;
    default:
      return <FileText className="w-3 h-3" />;
  }
};

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const TimelineItem = ({
  item,
  index,
  isSelected,
  onSelect,
  onRemove,
  onDuplicate,
  onDurationChange,
  onOpenSettings,
  onDragStart,
  onDragOver,
  onDrop,
}: TimelineItemProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localDuration, setLocalDuration] = useState(
    item.duration_override || item.media?.duration || 8
  );
  const duration = item.duration_override || item.media?.duration || 8;
  const hasError = !item.media?.file_url;
  const hasScheduleOverride = item.is_schedule_override;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
    onDragStart(e, index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
    onDragOver(e);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e, index);
  };

  const handleDurationSubmit = () => {
    if (localDuration !== duration && localDuration > 0) {
      onDurationChange(localDuration);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onSelect}
      className={`
        relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden cursor-pointer
        transition-all duration-200 group
        ${isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
        ${isDragOver ? "scale-105 ring-2 ring-primary/50" : ""}
        ${hasError ? "ring-2 ring-destructive/50" : ""}
      `}
    >
      {/* Thumbnail */}
      <div className="absolute inset-0 bg-muted">
        {item.media?.file_url ? (
          item.media.type === "video" ? (
            <video
              src={item.media.file_url}
              className="w-full h-full object-cover"
              muted
            />
          ) : (
            <img
              src={item.media.file_url}
              alt={item.media.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {getMediaIcon(item.media?.type || "image")}
          </div>
        )}
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Drag handle - top left on hover */}
      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-0.5 rounded bg-black/50 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-3 h-3 text-white" />
        </div>
      </div>

      {/* Schedule indicator */}
      {hasScheduleOverride && (
        <div className="absolute top-1 right-1">
          <Badge variant="secondary" className="bg-blue-500/80 text-white border-0 h-4 px-1">
            <Calendar className="w-2.5 h-2.5" />
          </Badge>
        </div>
      )}

      {/* Error indicator */}
      {hasError && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2">
          <Badge variant="destructive" className="text-[10px] h-4 px-1">
            <AlertTriangle className="w-2.5 h-2.5" />
          </Badge>
        </div>
      )}

      {/* Content info at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-1.5">
        <div className="flex items-center gap-1">
          {getMediaIcon(item.media?.type || "image")}
          <span className="text-white text-[10px] font-medium truncate flex-1">
            {item.media?.name || "Sem nome"}
          </span>
        </div>
        
        <div className="flex items-center gap-1 mt-0.5">
          <Clock className="w-2.5 h-2.5 text-white/70" />
          <span className="text-white/70 text-[10px]">{formatDuration(duration)}</span>
        </div>
      </div>

      {/* Actions menu - top right on hover */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenSettings(); }}>
              <Settings className="w-3.5 h-3.5 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="w-3.5 h-3.5 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRemove} className="text-destructive">
              <X className="w-3.5 h-3.5 mr-2" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
