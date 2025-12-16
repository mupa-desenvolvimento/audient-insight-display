import { useState, useRef } from "react";
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
  Settings
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

const getMediaIcon = (type: string) => {
  switch (type) {
    case "video":
      return <Video className="w-5 h-5" />;
    case "image":
      return <Image className="w-5 h-5" />;
    default:
      return <FileText className="w-5 h-5" />;
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
  onDragStart,
  onDragOver,
  onDrop,
}: TimelineItemProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localDuration, setLocalDuration] = useState(
    item.duration_override || item.media?.duration || 10
  );
  const duration = item.duration_override || item.media?.duration || 10;
  const hasError = !item.media?.file_url;

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
        relative flex-shrink-0 w-36 h-48 rounded-xl overflow-hidden cursor-pointer
        transition-all duration-200 group
        ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

      {/* Drag handle */}
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-1 rounded bg-black/50 cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Position badge */}
      <div className="absolute top-2 right-2">
        <Badge variant="secondary" className="bg-black/50 text-white border-0 text-xs">
          {index + 1}
        </Badge>
      </div>

      {/* Error indicator */}
      {hasError && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        </div>
      )}

      {/* Content info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="flex items-center gap-1.5 mb-1">
          {getMediaIcon(item.media?.type || "image")}
          <span className="text-white text-xs font-medium truncate">
            {item.media?.name || "Sem nome"}
          </span>
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-white/80 hover:text-white hover:bg-white/20"
              onClick={(e) => e.stopPropagation()}
            >
              <Clock className="w-3 h-3 mr-1" />
              {formatDuration(duration)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-3" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <label className="text-xs font-medium">Duração (segundos)</label>
              <Input
                type="number"
                min={1}
                value={localDuration}
                onChange={(e) => setLocalDuration(parseInt(e.target.value) || 10)}
                onBlur={handleDurationSubmit}
                onKeyDown={(e) => e.key === "Enter" && handleDurationSubmit()}
                className="h-8"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Actions */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-black/50 hover:bg-black/70 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRemove} className="text-destructive">
              <X className="w-4 h-4 mr-2" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
