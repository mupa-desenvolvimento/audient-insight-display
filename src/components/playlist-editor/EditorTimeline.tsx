import { useState, useCallback, useRef } from "react";
import { PlaylistItem } from "@/hooks/usePlaylistItems";
import { MediaItem } from "@/hooks/useMediaItems";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Clock, 
  Trash2, 
  Copy,
  GripVertical,
  Image,
  Video,
  FileText,
  MoreVertical,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface EditorTimelineProps {
  items: PlaylistItem[];
  selectedItemId: string | null;
  currentPreviewIndex: number;
  onSelectItem: (id: string | null) => void;
  onSetPreviewIndex: (index: number) => void;
  onAddMedia: (media: MediaItem, position: number) => void;
  onRemoveItem: (id: string) => void;
  onDuplicateItem: (item: PlaylistItem) => void;
  onUpdateDuration: (id: string, duration: number) => void;
  onReorderItems: (items: { id: string; position: number }[]) => void;
  totalDuration: number;
  isPlaying: boolean;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
  return `${secs}s`;
};

const getMediaIcon = (type: string) => {
  switch (type) {
    case "video": return Video;
    case "image": return Image;
    default: return FileText;
  }
};

export const EditorTimeline = ({
  items,
  selectedItemId,
  currentPreviewIndex,
  onSelectItem,
  onSetPreviewIndex,
  onAddMedia,
  onRemoveItem,
  onDuplicateItem,
  onUpdateDuration,
  onReorderItems,
  totalDuration,
  isPlaying,
}: EditorTimelineProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const mediaData = e.dataTransfer.getData("application/json");
    if (mediaData) {
      try {
        const media = JSON.parse(mediaData) as MediaItem;
        onAddMedia(media, items.length);
      } catch {
        // Not valid JSON
      }
    }
  }, [items.length, onAddMedia]);

  const handleItemDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
    setDraggedIndex(index);
  }, []);

  const handleItemDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    const dragIndexStr = e.dataTransfer.getData("text/plain");
    if (dragIndexStr && draggedIndex !== null) {
      const dragIndex = parseInt(dragIndexStr);
      if (dragIndex !== dropIndex) {
        const newItems = [...items];
        const [draggedItem] = newItems.splice(dragIndex, 1);
        newItems.splice(dropIndex, 0, draggedItem);
        
        const reordered = newItems.map((item, idx) => ({
          id: item.id,
          position: idx,
        }));
        onReorderItems(reordered);
      }
      setDraggedIndex(null);
      return;
    }

    const mediaData = e.dataTransfer.getData("application/json");
    if (mediaData) {
      try {
        const media = JSON.parse(mediaData) as MediaItem;
        onAddMedia(media, dropIndex);
      } catch {
        // Ignore
      }
    }
    setDraggedIndex(null);
  }, [items, draggedIndex, onAddMedia, onReorderItems]);

  // Calculate cumulative time for each item
  const itemTimes = items.reduce<{ startTime: number; endTime: number }[]>((acc, item, index) => {
    const duration = item.duration_override || item.media?.duration || 10;
    const startTime = index === 0 ? 0 : acc[index - 1].endTime;
    acc.push({ startTime, endTime: startTime + duration });
    return acc;
  }, []);

  return (
    <div 
      className={cn(
        "flex flex-col bg-[#18181b] border-t border-white/10 transition-all",
        isExpanded ? "h-48" : "h-12"
      )}
    >
      {/* Timeline Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            <span className="text-xs font-medium">Timeline</span>
          </button>
          
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(totalDuration)}
            </span>
            <span className="text-white/30">•</span>
            <span>{items.length} {items.length === 1 ? "item" : "itens"}</span>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      {isExpanded && (
        <div 
          className={cn(
            "flex-1 relative transition-colors",
            isDragOver ? "bg-primary/5" : ""
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {items.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className={cn(
                  "flex flex-col items-center gap-2 px-8 py-4 rounded-xl border-2 border-dashed transition-colors",
                  isDragOver ? "border-primary bg-primary/10" : "border-white/10"
                )}
              >
                <Plus className="w-8 h-8 text-white/30" />
                <p className="text-xs text-white/40">Arraste mídias aqui</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="flex items-stretch gap-1 p-3 min-w-max">
                {items.map((item, index) => {
                  const duration = item.duration_override || item.media?.duration || 10;
                  const isSelected = selectedItemId === item.id;
                  const isCurrent = currentPreviewIndex === index;
                  const Icon = getMediaIcon(item.media?.type || "image");
                  
                  // Calculate width based on duration (min 80px, 8px per second)
                  const width = Math.max(80, duration * 8);

                  return (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleItemDragStart(e, index)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleItemDrop(e, index)}
                      onClick={() => {
                        onSelectItem(item.id);
                        onSetPreviewIndex(index);
                      }}
                      className={cn(
                        "group relative flex-shrink-0 rounded-lg overflow-hidden cursor-pointer transition-all",
                        "border-2",
                        isSelected ? "border-primary" : isCurrent ? "border-white/30" : "border-transparent",
                        draggedIndex === index ? "opacity-50" : ""
                      )}
                      style={{ width: `${width}px`, height: "100%" }}
                    >
                      {/* Thumbnail */}
                      <div className="absolute inset-0 bg-[#27272a]">
                        {item.media?.file_url && (
                          item.media.type === "video" ? (
                            <video
                              src={item.media.file_url}
                              className="w-full h-full object-cover opacity-80"
                              muted
                            />
                          ) : (
                            <img
                              src={item.media.file_url}
                              alt=""
                              className="w-full h-full object-cover opacity-80"
                            />
                          )
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      </div>

                      {/* Content */}
                      <div className="absolute inset-0 flex flex-col justify-between p-2">
                        {/* Top Row */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-1 bg-black/50 rounded cursor-grab active:cursor-grabbing">
                              <GripVertical className="w-3 h-3 text-white/70" />
                            </div>
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 bg-black/50 hover:bg-black/70 text-white/70 hover:text-white transition-all"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#27272a] border-white/10">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDuplicateItem(item);
                                }}
                                className="text-white/70 hover:text-white focus:text-white focus:bg-white/10"
                              >
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveItem(item.id);
                                }}
                                className="text-red-400 hover:text-red-300 focus:text-red-300 focus:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Bottom Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3 h-3 text-white/70" />
                            <span className="text-[10px] text-white/80 font-medium truncate max-w-[60px]">
                              {item.media?.name || "Sem nome"}
                            </span>
                          </div>
                          <span className="text-[10px] text-white/50 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDuration(duration)}
                          </span>
                        </div>
                      </div>

                      {/* Playing Indicator */}
                      {isCurrent && isPlaying && (
                        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </div>
                  );
                })}

                {/* Add Button at End */}
                <div
                  className={cn(
                    "flex-shrink-0 w-16 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors",
                    isDragOver ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20"
                  )}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleItemDrop(e, items.length)}
                >
                  <Plus className="w-5 h-5 text-white/30" />
                </div>
              </div>
              <ScrollBar orientation="horizontal" className="bg-white/5" />
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
};
