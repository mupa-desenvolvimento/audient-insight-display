import { useState, useCallback, useEffect } from "react";
import { PlaylistChannel, usePlaylistChannelItems } from "@/hooks/usePlaylistChannels";
import { MediaItem } from "@/hooks/useMediaItems";
import { EditorSidebar } from "./EditorSidebar";
import { EditorCanvas } from "./EditorCanvas";
import { EditorTimeline } from "./EditorTimeline";
import { EditorPropertiesPanel } from "./EditorPropertiesPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Radio, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelEditorProps {
  channel: PlaylistChannel;
  playlistName: string;
  onBack: () => void;
  onUpdateChannel: (updates: Partial<PlaylistChannel>) => void;
}

export const ChannelEditor = ({
  channel,
  playlistName,
  onBack,
  onUpdateChannel,
}: ChannelEditorProps) => {
  const { 
    items, 
    isLoading: itemsLoading, 
    addItem, 
    removeItem, 
    updateItem, 
    reorderItems,
    getTotalDuration 
  } = usePlaylistChannelItems(channel.id);

  const [activePanel, setActivePanel] = useState<"media" | null>("media");
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [zoom, setZoom] = useState(100);

  const totalDuration = getTotalDuration();
  const currentPreviewItem = items[currentPreviewIndex];

  // Check if channel is currently active
  const isChannelActive = () => {
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

  const handleAddMedia = useCallback(async (media: MediaItem, position: number) => {
    const itemDuration = media.type === 'video' && media.duration ? media.duration : 8;
    
    addItem.mutate({
      channel_id: channel.id,
      media_id: media.id,
      position,
      duration_override: itemDuration,
    });
  }, [channel.id, addItem]);

  const handleRemoveItem = useCallback((id: string) => {
    removeItem.mutate(id);
    if (selectedItemId === id) {
      setSelectedItemId(null);
    }
  }, [removeItem, selectedItemId]);

  const handleDuplicateItem = useCallback(async (item: typeof items[0]) => {
    addItem.mutate({
      channel_id: channel.id,
      media_id: item.media_id,
      position: items.length,
      duration_override: item.duration_override,
    });
  }, [channel.id, items.length, addItem]);

  const handleUpdateDuration = useCallback((id: string, duration: number) => {
    updateItem.mutate({ id, duration_override: duration });
  }, [updateItem]);

  const handleUpdateItemSettings = useCallback((id: string, updates: {
    duration_override: number;
    is_schedule_override: boolean;
    start_date: string | null;
    end_date: string | null;
    start_time: string | null;
    end_time: string | null;
    days_of_week: number[] | null;
  }) => {
    updateItem.mutate({ id, ...updates });
  }, [updateItem]);

  const handleReorderItems = useCallback((orderedItems: { id: string; position: number }[]) => {
    reorderItems.mutate(orderedItems);
  }, [reorderItems]);

  // Format items to match expected shape
  const formattedItems = items.map(item => ({
    ...item,
    playlist_id: channel.playlist_id, // Add for compatibility
  }));

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Channel Header - Fixed */}
      <div className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          
          <div className="h-6 w-px bg-border" />
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Radio className="w-5 h-5 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{channel.name}</span>
                  {isChannelActive() ? (
                    <Badge className="bg-green-500">
                      <Play className="w-3 h-3 mr-1" />
                      Ao Vivo
                    </Badge>
                  ) : channel.is_fallback ? (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                      Fallback
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Programado</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Playlist: {playlistName}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {channel.start_time.slice(0, 5)} - {channel.end_time.slice(0, 5)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{items.length} mídias</span>
          <span>•</span>
          <span>{Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, '0')}</span>
        </div>
      </div>

      {/* Main Content - Takes remaining height */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Sidebar - Tools */}
        <EditorSidebar
          activePanel={activePanel}
          onPanelChange={setActivePanel}
        />

        {/* Left Panel - Media Library with internal scroll */}
        {activePanel === "media" && (
          <div className="w-72 flex flex-col overflow-hidden border-r bg-muted/50">
            <EditorPropertiesPanel
              activePanel={activePanel}
              formData={{ 
                name: channel.name, 
                description: channel.description,
                channel_id: null,
                is_active: channel.is_active,
                start_date: null,
                end_date: null,
                days_of_week: channel.days_of_week,
                start_time: channel.start_time.slice(0, 5),
                end_time: channel.end_time.slice(0, 5),
                priority: 5,
              }}
              channels={[]}
              itemCount={items.length}
              totalDuration={totalDuration}
              connectedDevicesCount={0}
              onFormChange={() => {}}
              onAddMedia={handleAddMedia}
              itemsLength={items.length}
            />
          </div>
        )}

        {/* Center - Canvas/Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <EditorCanvas
            currentItem={currentPreviewItem as any}
            isPlaying={isPreviewPlaying}
            onTogglePlay={() => setIsPreviewPlaying(!isPreviewPlaying)}
            onPrevious={() => setCurrentPreviewIndex(Math.max(0, currentPreviewIndex - 1))}
            onNext={() => {
              if (currentPreviewIndex >= items.length - 1) {
                setCurrentPreviewIndex(0);
              } else {
                setCurrentPreviewIndex(currentPreviewIndex + 1);
              }
            }}
            currentIndex={currentPreviewIndex}
            totalItems={items.length}
            zoom={zoom}
            onZoomChange={setZoom}
          />

          {/* Timeline */}
          <EditorTimeline
            items={formattedItems as any}
            selectedItemId={selectedItemId}
            currentPreviewIndex={currentPreviewIndex}
            onSelectItem={setSelectedItemId}
            onSetPreviewIndex={setCurrentPreviewIndex}
            onAddMedia={handleAddMedia}
            onRemoveItem={handleRemoveItem}
            onDuplicateItem={handleDuplicateItem as any}
            onUpdateDuration={handleUpdateDuration}
            onUpdateItemSettings={handleUpdateItemSettings}
            onReorderItems={handleReorderItems}
            totalDuration={totalDuration}
            isPlaying={isPreviewPlaying}
          />
        </div>
      </div>
    </div>
  );
};
