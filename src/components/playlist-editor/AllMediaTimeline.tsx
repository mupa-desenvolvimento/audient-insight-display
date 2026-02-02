import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { PlaylistChannel, PlaylistChannelWithItems, PlaylistChannelItem } from "@/hooks/usePlaylistChannels";
import { cn } from "@/lib/utils";
import { Video, Image, Clock, Film, Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut, Maximize2, GripVertical } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface AllMediaTimelineProps {
  channelsWithItems: PlaylistChannelWithItems[];
  onSelectChannel: (channel: PlaylistChannel) => void;
  onReorderGlobal?: (items: { channelId: string; itemId: string; newPosition: number }[]) => void;
}

// Color palette for channels
const channelColors = [
  { bg: "bg-blue-500/20", border: "border-blue-500", accent: "bg-blue-500", text: "text-blue-400", name: "blue" },
  { bg: "bg-emerald-500/20", border: "border-emerald-500", accent: "bg-emerald-500", text: "text-emerald-400", name: "emerald" },
  { bg: "bg-violet-500/20", border: "border-violet-500", accent: "bg-violet-500", text: "text-violet-400", name: "violet" },
  { bg: "bg-amber-500/20", border: "border-amber-500", accent: "bg-amber-500", text: "text-amber-400", name: "amber" },
  { bg: "bg-rose-500/20", border: "border-rose-500", accent: "bg-rose-500", text: "text-rose-400", name: "rose" },
  { bg: "bg-cyan-500/20", border: "border-cyan-500", accent: "bg-cyan-500", text: "text-cyan-400", name: "cyan" },
];

interface DragState {
  isDragging: boolean;
  dragIndex: number | null;
  dropIndex: number | null;
}

export const AllMediaTimeline = ({
  channelsWithItems,
  onSelectChannel,
  onReorderGlobal,
}: AllMediaTimelineProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragIndex: null,
    dropIndex: null,
  });
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Aggregate all media items from all channels with sequential order
  const allMediaItems = useMemo(() => {
    const items: { item: PlaylistChannelItem; channel: PlaylistChannelWithItems; channelIndex: number; globalIndex: number }[] = [];
    let globalIndex = 0;
    
    channelsWithItems.forEach((channel, channelIndex) => {
      if (channel.items && channel.items.length > 0) {
        channel.items.forEach(item => {
          items.push({ item, channel, channelIndex, globalIndex });
          globalIndex++;
        });
      }
    });
    
    return items;
  }, [channelsWithItems]);

  // Calculate total duration of all media
  const totalMediaDuration = useMemo(() => {
    return allMediaItems.reduce((sum, { item }) => {
      return sum + (item.duration_override || item.media?.duration || 8);
    }, 0);
  }, [allMediaItems]);

  // Calculate positions for all media items as a continuous timeline
  const mediaWithPositions = useMemo(() => {
    let currentOffset = 0;
    return allMediaItems.map(({ item, channel, channelIndex, globalIndex }) => {
      const duration = item.duration_override || item.media?.duration || 8;
      const widthPercent = totalMediaDuration > 0 ? (duration / totalMediaDuration) * 100 : 0;
      const startTime = currentOffset;
      currentOffset += duration;
      
      return {
        item,
        channel,
        channelIndex,
        globalIndex,
        duration,
        widthPercent,
        startTime,
        endTime: currentOffset,
        color: channelColors[channelIndex % channelColors.length],
      };
    });
  }, [allMediaItems, totalMediaDuration]);

  // Current item based on index
  const currentMedia = mediaWithPositions[currentIndex];

  // Playback timer
  useEffect(() => {
    if (!isPlaying || mediaWithPositions.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const current = mediaWithPositions[currentIndex];
    if (!current) return;

    timerRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        const duration = current.duration;
        if (prev >= duration) {
          // Move to next item
          if (currentIndex < mediaWithPositions.length - 1) {
            setCurrentIndex(currentIndex + 1);
          } else {
            setCurrentIndex(0); // Loop back
          }
          return 0;
        }
        return prev + 0.1;
      });
    }, 100);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, currentIndex, mediaWithPositions]);

  const handleItemClick = (index: number) => {
    setCurrentIndex(index);
    setCurrentTime(0);
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
    setCurrentTime(0);
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(mediaWithPositions.length - 1, prev + 1));
    setCurrentTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Drag and Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDragState(prev => ({ ...prev, isDragging: true, dragIndex: index }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragState.dropIndex !== index) {
      setDragState(prev => ({ ...prev, dropIndex: index }));
    }
  }, [dragState.dropIndex]);

  const handleDragEnd = useCallback(() => {
    setDragState({ isDragging: false, dragIndex: null, dropIndex: null });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    
    if (dragIndex !== dropIndex && onReorderGlobal) {
      // Build reorder commands
      const reorderCommands: { channelId: string; itemId: string; newPosition: number }[] = [];
      
      // Get the dragged item
      const draggedItem = mediaWithPositions[dragIndex];
      const targetItem = mediaWithPositions[dropIndex];
      
      if (draggedItem && targetItem) {
        // For now, just log - actual reordering would need more complex logic
        console.log(`Reorder: Move item ${dragIndex} to position ${dropIndex}`);
        
        reorderCommands.push({
          channelId: draggedItem.channel.id,
          itemId: draggedItem.item.id,
          newPosition: dropIndex,
        });
        
        onReorderGlobal(reorderCommands);
      }
    }
    
    handleDragEnd();
  }, [mediaWithPositions, onReorderGlobal, handleDragEnd]);

  // Calculate minimum width per item based on zoom
  const getItemWidth = (widthPercent: number, duration: number) => {
    const baseMinWidth = 100; // minimum width in pixels
    const scaledWidth = (duration / 8) * (zoom * 1.2); // Scale based on duration and zoom
    return Math.max(baseMinWidth, scaledWidth);
  };

  if (allMediaItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
        <Film className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm font-medium">Nenhuma mídia na playlist</p>
        <p className="text-xs mt-1">Adicione mídias aos canais para visualizá-las aqui</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[hsl(var(--background))]">
      {/* Preview Area */}
      <div className="flex-1 flex items-center justify-center bg-muted/20 relative overflow-hidden">
        {currentMedia && (
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {/* Main Preview */}
            <div className="relative max-w-full max-h-full rounded-lg overflow-hidden shadow-2xl bg-black">
              {currentMedia.item.media?.type === 'video' ? (
                <video
                  key={currentMedia.item.id}
                  src={currentMedia.item.media.file_url || ''}
                  className="max-w-full max-h-[50vh] object-contain"
                  muted
                  autoPlay={isPlaying}
                />
              ) : (
                <img
                  key={currentMedia.item.id}
                  src={currentMedia.item.media?.thumbnail_url || currentMedia.item.media?.file_url || ''}
                  alt={currentMedia.item.media?.name || 'Preview'}
                  className="max-w-full max-h-[50vh] object-contain"
                />
              )}
              
              {/* Fullscreen button */}
              <button className="absolute top-3 right-3 p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors">
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
              
              {/* Media Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", currentMedia.color.accent)} />
                  <Badge variant="secondary" className={cn("text-[10px] uppercase", currentMedia.color.bg, currentMedia.color.text, "border-0")}>
                    {currentMedia.channel.name}
                  </Badge>
                  <span className="text-white text-sm font-medium truncate">
                    {currentMedia.item.media?.name}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="shrink-0 border-t border-b bg-card px-4 py-2 flex items-center justify-between gap-4">
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.max(50, z - 25))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Slider
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
            min={50}
            max={200}
            step={25}
            className="w-24"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(z => Math.min(200, z + 25))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-12">{zoom}%</span>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevious}>
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button 
            variant="default" 
            size="icon" 
            className="h-10 w-10 rounded-full"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNext}>
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Position Info */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{currentIndex + 1} / {allMediaItems.length}</span>
        </div>
      </div>

      {/* Channel Legend */}
      <div className="shrink-0 bg-muted/30 px-4 py-2 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">{formatTime(totalMediaDuration)}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-xs text-muted-foreground">{allMediaItems.length} itens</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-3">
          {channelsWithItems.map((channel, index) => {
            const color = channelColors[index % channelColors.length];
            const itemCount = channel.items?.length || 0;
            if (itemCount === 0) return null;
            
            return (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
                  "hover:bg-muted"
                )}
              >
                <div className={cn("w-2.5 h-2.5 rounded-full", color.accent)} />
                <span className={cn("text-xs font-medium", color.text)}>{channel.name}</span>
                <span className="text-[10px] text-muted-foreground">({itemCount})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline - Horizontal thumbnails with drag and drop */}
      <div className="shrink-0 bg-muted/10" ref={timelineRef}>
        <ScrollArea className="w-full">
          <div className="flex p-3 gap-2 min-w-max">
            {mediaWithPositions.map(({ item, channel, channelIndex, duration, widthPercent, globalIndex, color }) => {
              const isActive = currentIndex === globalIndex;
              const isDragging = dragState.dragIndex === globalIndex;
              const isDropTarget = dragState.dropIndex === globalIndex && dragState.dragIndex !== globalIndex;
              const itemWidth = getItemWidth(widthPercent, duration);
              
              return (
                <div
                  key={item.id}
                  className="relative"
                >
                  {/* Drop indicator left */}
                  {isDropTarget && dragState.dragIndex !== null && dragState.dragIndex > globalIndex && (
                    <div className="absolute -left-1 top-0 bottom-0 w-1 bg-primary rounded-full z-10" />
                  )}
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, globalIndex)}
                          onDragOver={(e) => handleDragOver(e, globalIndex)}
                          onDragEnd={handleDragEnd}
                          onDrop={(e) => handleDrop(e, globalIndex)}
                          onClick={() => handleItemClick(globalIndex)}
                          className={cn(
                            "shrink-0 rounded-lg overflow-hidden transition-all relative group cursor-grab active:cursor-grabbing",
                            "border-2",
                            isActive ? "border-primary ring-2 ring-primary/30" : color.border,
                            isDragging && "opacity-50 scale-95",
                            !isDragging && "hover:scale-[1.02]"
                          )}
                          style={{ 
                            width: itemWidth,
                            height: 100,
                          }}
                        >
                          {/* Channel color bar at top */}
                          <div className={cn("absolute top-0 left-0 right-0 h-1.5 z-10", color.accent)} />
                          
                          {/* Drag handle */}
                          <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="p-1 rounded bg-black/60">
                              <GripVertical className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          
                          {/* Thumbnail */}
                          <div className="absolute inset-0 bg-muted">
                            {item.media?.thumbnail_url || item.media?.file_url ? (
                              item.media.type === 'video' ? (
                                <video
                                  src={item.media.file_url || ''}
                                  className="w-full h-full object-cover"
                                  muted
                                />
                              ) : (
                                <img
                                  src={item.media.thumbnail_url || item.media.file_url || ''}
                                  alt={item.media.name}
                                  className="w-full h-full object-cover"
                                />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-muted">
                                {item.media?.type === 'video' ? (
                                  <Video className="w-8 h-8 text-muted-foreground" />
                                ) : (
                                  <Image className="w-8 h-8 text-muted-foreground" />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Overlay gradient */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                          {/* Channel badge */}
                          <Badge 
                            className={cn(
                              "absolute top-3 right-2 text-[9px] px-1.5 py-0.5 h-auto uppercase font-bold border-0",
                              color.bg, color.text
                            )}
                          >
                            {channel.name}
                          </Badge>

                          {/* Type badge */}
                          <div className="absolute top-3 left-8 flex items-center gap-1">
                            <Badge 
                              variant="secondary" 
                              className="text-[8px] px-1 py-0 h-4 uppercase bg-black/60 text-white border-0"
                            >
                              {item.media?.type === 'video' ? <Video className="w-2.5 h-2.5" /> : <Image className="w-2.5 h-2.5" />}
                            </Badge>
                          </div>

                          {/* Name and duration at bottom */}
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <p className="text-[11px] text-white font-medium truncate leading-tight mb-0.5">
                              {item.media?.name}
                            </p>
                            <div className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-white/70" />
                              <span className="text-[10px] text-white/70">{duration}s</span>
                            </div>
                          </div>

                          {/* Play indicator for active item */}
                          {isActive && isPlaying && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                                <Play className="w-4 h-4 text-black fill-black ml-0.5" />
                              </div>
                            </div>
                          )}

                          {/* Progress bar for active item */}
                          {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                              <div 
                                className="h-full bg-primary transition-all"
                                style={{ width: `${(currentTime / duration) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="text-xs space-y-1">
                          <p className="font-medium">{item.media?.name}</p>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <div className={cn("w-2 h-2 rounded-full", color.accent)} />
                            <span>{channel.name}</span>
                            <span>•</span>
                            <span>{duration}s</span>
                          </div>
                          <p className="text-muted-foreground/70">Arraste para reordenar</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* Drop indicator right */}
                  {isDropTarget && dragState.dragIndex !== null && dragState.dragIndex < globalIndex && (
                    <div className="absolute -right-1 top-0 bottom-0 w-1 bg-primary rounded-full z-10" />
                  )}
                </div>
              );
            })}
            
            {/* Add button placeholder */}
            <div className="shrink-0 w-20 h-[100px] rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer">
              <span className="text-2xl">+</span>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
};
