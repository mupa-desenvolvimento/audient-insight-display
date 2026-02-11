import { useState, useRef, useCallback } from "react";
import { PlaylistItem } from "@/hooks/usePlaylistItems";
import { MediaItem } from "@/hooks/useMediaItems";
import { TimelineItem } from "./TimelineItem";
import { ItemSettingsDialog } from "./ItemSettingsDialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, AlertCircle } from "lucide-react";

interface PlaylistTimelineProps {
  items: PlaylistItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string | null) => void;
  onAddMedia: (media: MediaItem, position: number) => void;
  onRemoveItem: (id: string) => void;
  onDuplicateItem: (item: PlaylistItem) => void;
  onUpdateDuration: (id: string, duration: number) => void;
  onUpdateItemSettings: (id: string, updates: {
    duration_override: number;
    is_schedule_override: boolean;
    start_date: string | null;
    end_date: string | null;
    start_time: string | null;
    end_time: string | null;
    days_of_week: number[] | null;
  }) => void;
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
  onUpdateItemSettings,
  onReorderItems,
  totalDuration,
}: PlaylistTimelineProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [settingsItem, setSettingsItem] = useState<PlaylistItem | null>(null);
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
    <>
      <div className="h-full flex flex-col bg-background">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2 border-b bg-card/50">
          <h3 className="font-medium text-sm">Timeline</h3>
          <Badge variant="outline" className="gap-1 text-xs">
            <Clock className="w-3 h-3" />
            {formatTotalDuration(totalDuration)}
          </Badge>
          <span className="text-muted-foreground text-xs">
            • {items.length} {items.length === 1 ? "item" : "itens"}
          </span>

          {hasValidationErrors && (
            <Badge variant="destructive" className="gap-1 ml-auto text-xs">
              <AlertCircle className="w-3 h-3" />
              Playlist vazia
            </Badge>
          )}
        </div>

        {/* Timeline - horizontal scroll */}
        <div
          className={`flex-1 relative transition-colors min-h-0 ${
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
                  w-48 h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2
                  transition-colors
                  ${isDragOver ? "border-primary bg-primary/10" : "border-muted-foreground/30"}
                `}
              >
                <Plus className="w-6 h-6" />
                <p className="text-xs text-center px-2">
                  Arraste mídias para começar
                </p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full w-full">
              <div className="flex items-center gap-2 p-3 min-w-max">
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
                    onOpenSettings={() => setSettingsItem(item)}
                    onDragStart={handleItemDragStart}
                    onDragOver={handleItemDragOver}
                    onDrop={handleItemDrop}
                  />
                ))}

                {/* Drop zone at end */}
                <div
                  className={`
                    flex-shrink-0 w-20 h-24 rounded-lg border-2 border-dashed
                    flex flex-col items-center justify-center gap-1 text-muted-foreground
                    transition-colors cursor-pointer hover:border-primary/50
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
                  <Plus className="w-5 h-5" />
                  <span className="text-[10px]">Adicionar</span>
                </div>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}

          {/* Drag overlay */}
          {isDragOver && items.length > 0 && (
            <div className="absolute inset-0 bg-primary/5 pointer-events-none flex items-center justify-center">
              <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg shadow-lg text-sm">
                Solte para adicionar
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Dialog */}
      <ItemSettingsDialog
        item={settingsItem}
        open={!!settingsItem}
        onOpenChange={(open) => !open && setSettingsItem(null)}
        onSave={onUpdateItemSettings}
      />
    </>
  );
};
