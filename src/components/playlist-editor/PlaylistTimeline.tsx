import { useState, useRef, useCallback } from "react";
import { PlaylistItem } from "@/hooks/usePlaylistItems";
import { MediaItem } from "@/hooks/useMediaItems";
import { TimelineItem } from "./TimelineItem";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Trash2, AlertCircle } from "lucide-react";

interface PlaylistTimelineProps {
  items: PlaylistItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onAddMedia: (media: MediaItem, position: number) => void;
  onRemoveItem: (id: string) => void;
  onDuplicateItem: (item: PlaylistItem) => void;
  onUpdateDuration: (id: string, duration: number) => void;
  onReorderItems: (items: { id: string; position: number }[]) => void;
  totalDuration: number;
}

const formatTotalDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
};

export const PlaylistTimeline = ({
  items,
  selectedItemId,
  onSelectItem,
  onAddMedia,
  onRemoveItem,
  onDuplicateItem,
  onUpdateDuration,
  onReorderItems,
  totalDuration,
}: PlaylistTimelineProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
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

    // Check if it's a new media from library
    const mediaData = e.dataTransfer.getData("application/json");
    if (mediaData) {
      try {
        const media = JSON.parse(mediaData) as MediaItem;
        onAddMedia(media, items.length);
        return;
      } catch {
        // Not valid JSON, might be reorder
      }
    }
  }, [items.length, onAddMedia]);

  const handleItemDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleItemDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleItemDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    // Check if reordering within timeline
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

    // Check if it's a new media from library
    const mediaData = e.dataTransfer.getData("application/json");
    if (mediaData) {
      try {
        const media = JSON.parse(mediaData) as MediaItem;
        onAddMedia(media, dropIndex);
      } catch {
        // Ignore parse errors
      }
    }
    setDraggedIndex(null);
  }, [items, draggedIndex, onAddMedia, onReorderItems]);

  const hasValidationErrors = items.length === 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">Timeline</h3>
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            {formatTotalDuration(totalDuration)}
          </Badge>
          <Badge variant="secondary">
            {items.length} {items.length === 1 ? "item" : "itens"}
          </Badge>
        </div>

        {hasValidationErrors && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Playlist vazia
          </Badge>
        )}
      </div>

      {/* Timeline */}
      <div
        className={`flex-1 relative transition-colors ${
          isDragOver ? "bg-primary/5" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {items.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <div
              className={`
                w-64 h-48 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3
                transition-colors
                ${isDragOver ? "border-primary bg-primary/10" : "border-muted-foreground/30"}
              `}
            >
              <Plus className="w-10 h-10" />
              <p className="text-sm text-center px-4">
                Arraste mídias da biblioteca para começar
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-6">
              <div className="flex items-center gap-4 pb-4">
                {items.map((item, index) => (
                  <TimelineItem
                    key={item.id}
                    item={item}
                    index={index}
                    isSelected={selectedItemId === item.id}
                    onSelect={() => onSelectItem(item.id)}
                    onRemove={() => onRemoveItem(item.id)}
                    onDuplicate={() => onDuplicateItem(item)}
                    onDurationChange={(duration) => onUpdateDuration(item.id, duration)}
                    onDragStart={handleItemDragStart}
                    onDragOver={handleItemDragOver}
                    onDrop={handleItemDrop}
                  />
                ))}

                {/* Drop zone at end */}
                <div
                  className={`
                    flex-shrink-0 w-36 h-48 rounded-xl border-2 border-dashed
                    flex flex-col items-center justify-center gap-2 text-muted-foreground
                    transition-colors
                    ${isDragOver ? "border-primary bg-primary/10" : "border-muted-foreground/30"}
                  `}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleItemDrop(e, items.length);
                  }}
                >
                  <Plus className="w-8 h-8" />
                  <span className="text-xs">Adicionar</span>
                </div>
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}

        {/* Drag overlay */}
        {isDragOver && items.length > 0 && (
          <div className="absolute inset-0 bg-primary/5 pointer-events-none flex items-center justify-center">
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
              Solte para adicionar
            </div>
          </div>
        )}
      </div>

      {/* Time markers */}
      {items.length > 0 && (
        <div className="px-6 py-2 border-t bg-muted/30">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {items.reduce<{ time: number; items: { position: number; time: string }[] }>(
              (acc, item, index) => {
                const duration = item.duration_override || item.media?.duration || 10;
                const startTime = acc.time;
                const mins = Math.floor(startTime / 60);
                const secs = startTime % 60;
                acc.items.push({
                  position: index,
                  time: `${mins}:${secs.toString().padStart(2, "0")}`,
                });
                acc.time += duration;
                return acc;
              },
              { time: 0, items: [] }
            ).items.map((marker) => (
              <span key={marker.position} className="w-36 text-center">
                {marker.time}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
