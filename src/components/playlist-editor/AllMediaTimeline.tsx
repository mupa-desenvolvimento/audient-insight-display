import { useMemo, useState, useRef, useEffect } from "react";
import { PlaylistChannel, PlaylistChannelWithItems, PlaylistChannelItem } from "@/hooks/usePlaylistChannels";
import { cn } from "@/lib/utils";
import { Layers, Video, Image, Clock, Film, Radio, Play, Pause } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface AllMediaTimelineProps {
  channelsWithItems: PlaylistChannelWithItems[];
  onSelectChannel: (channel: PlaylistChannel) => void;
}

// Color palette for channels
const channelColors = [
  { bg: "bg-blue-500/20", border: "border-blue-500", accent: "bg-blue-500", text: "text-blue-500" },
  { bg: "bg-green-500/20", border: "border-green-500", accent: "bg-green-500", text: "text-green-500" },
  { bg: "bg-purple-500/20", border: "border-purple-500", accent: "bg-purple-500", text: "text-purple-500" },
  { bg: "bg-orange-500/20", border: "border-orange-500", accent: "bg-orange-500", text: "text-orange-500" },
  { bg: "bg-pink-500/20", border: "border-pink-500", accent: "bg-pink-500", text: "text-pink-500" },
  { bg: "bg-cyan-500/20", border: "border-cyan-500", accent: "bg-cyan-500", text: "text-cyan-500" },
];

export const AllMediaTimeline = ({
  channelsWithItems,
  onSelectChannel,
}: AllMediaTimelineProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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
      const leftPercent = totalMediaDuration > 0 ? (currentOffset / totalMediaDuration) * 100 : 0;
      const startTime = currentOffset;
      currentOffset += duration;
      
      return {
        item,
        channel,
        channelIndex,
        globalIndex,
        duration,
        widthPercent,
        leftPercent,
        startTime,
        endTime: currentOffset,
        color: channelColors[channelIndex % channelColors.length],
      };
    });
  }, [allMediaItems, totalMediaDuration]);

  // Current item based on playback time
  const currentItem = useMemo(() => {
    return mediaWithPositions.find(
      ({ startTime, endTime }) => currentTime >= startTime && currentTime < endTime
    );
  }, [mediaWithPositions, currentTime]);

  // Group items by channel
  const itemsByChannel = useMemo(() => {
    const grouped: Map<string, typeof mediaWithPositions> = new Map();
    
    mediaWithPositions.forEach(item => {
      const channelId = item.channel.id;
      if (!grouped.has(channelId)) {
        grouped.set(channelId, []);
      }
      grouped.get(channelId)!.push(item);
    });
    
    return grouped;
  }, [mediaWithPositions]);

  // Playback timer
  useEffect(() => {
    if (!isPlaying || totalMediaDuration === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= totalMediaDuration) {
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
  }, [isPlaying, totalMediaDuration]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPercent = (e.clientX - rect.left) / rect.width;
    setCurrentTime(clickPercent * totalMediaDuration);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (allMediaItems.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
        <Layers className="w-12 h-12 mb-3 opacity-50" />
        <p className="text-sm font-medium">Nenhuma mídia na playlist</p>
        <p className="text-xs mt-1">Adicione mídias aos canais para visualizá-las aqui</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Summary Header */}
      <div className="shrink-0 border-b bg-muted/30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium">Todas as Mídias</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Radio className="w-3.5 h-3.5" />
                {channelsWithItems.length} canais
              </span>
              <span className="flex items-center gap-1">
                <Film className="w-3.5 h-3.5" />
                {allMediaItems.length} mídias
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(totalMediaDuration)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Legend Bar */}
      <div className="shrink-0 border-b bg-muted/20 px-4 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          {channelsWithItems.map((channel, index) => {
            const color = channelColors[index % channelColors.length];
            const channelItemCount = channel.items?.length || 0;
            
            return (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 transition-colors border",
                  color.border
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", color.accent)} />
                <span className="font-medium truncate max-w-[100px]">{channel.name}</span>
                <Badge variant="secondary" className="text-[10px] px-1 h-4">
                  {channelItemCount}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline Preview Bar */}
      <div className="shrink-0 border-b bg-card px-4 py-3">
        <div 
          className="relative h-8 rounded-md overflow-hidden bg-muted/40 cursor-pointer"
          onClick={handleTimelineClick}
        >
          {/* Timeline segments */}
          <div className="flex h-full">
            {mediaWithPositions.map(({ item, color, widthPercent, duration, globalIndex }) => {
              const isActive = currentItem?.item.id === item.id;
              const isHovered = hoveredItemId === item.id;
              
              return (
                <TooltipProvider key={item.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-full border-r border-background/30 flex items-center justify-center overflow-hidden transition-all",
                          color.accent,
                          isActive && "ring-2 ring-white ring-inset",
                          isHovered && "brightness-110"
                        )}
                        style={{ width: `${widthPercent}%`, minWidth: 2 }}
                        onMouseEnter={() => setHoveredItemId(item.id)}
                        onMouseLeave={() => setHoveredItemId(null)}
                      >
                        <span className="text-[9px] text-white font-medium truncate px-0.5">
                          {widthPercent > 4 ? `${duration}s` : ''}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{globalIndex + 1}. {item.media?.name}</p>
                      <p className="text-xs text-muted-foreground">{duration}s</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>

          {/* Playhead */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
            style={{ left: `${(currentTime / totalMediaDuration) * 100}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
          </div>
        </div>

        {/* Playback controls */}
        <div className="flex items-center justify-between mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 mr-1" />
            ) : (
              <Play className="w-4 h-4 mr-1" />
            )}
            {isPlaying ? 'Pausar' : 'Simular'}
          </Button>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(totalMediaDuration)}</span>
            {currentItem && (
              <Badge variant="outline" className="text-[10px]">
                {currentItem.globalIndex + 1}/{allMediaItems.length} - {currentItem.item.media?.name}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Media Grid by Channel */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {channelsWithItems.map((channel, channelIndex) => {
            const items = itemsByChannel.get(channel.id) || [];
            const color = channelColors[channelIndex % channelColors.length];
            const channelDuration = items.reduce((sum, i) => sum + i.duration, 0);
            
            if (items.length === 0) return null;
            
            return (
              <div key={channel.id} className="space-y-2">
                {/* Channel Header */}
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded", color.accent)} />
                  <button
                    onClick={() => onSelectChannel(channel)}
                    className="text-sm font-medium hover:text-primary transition-colors"
                  >
                    {channel.name}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {items.length} mídias • {formatTime(channelDuration)}
                  </span>
                </div>

                {/* Media Items Row */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {items.map(({ item, duration, globalIndex, color: itemColor }) => {
                    const isActive = currentItem?.item.id === item.id;
                    
                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setHoveredItemId(item.id)}
                        onMouseLeave={() => setHoveredItemId(null)}
                        className={cn(
                          "shrink-0 rounded-lg border-2 overflow-hidden transition-all cursor-pointer",
                          itemColor.bg,
                          isActive ? "border-white ring-2 ring-white/50" : itemColor.border,
                          hoveredItemId === item.id && "scale-105"
                        )}
                        style={{ width: 140 }}
                      >
                        {/* Thumbnail */}
                        <div className="aspect-video bg-muted relative">
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
                          ) : item.media?.type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-6 h-6 text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          
                          {/* Duration badge */}
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                            {duration}s
                          </div>
                          
                          {/* Position badge */}
                          <div className={cn(
                            "absolute top-1 left-1 text-white text-[10px] w-5 h-5 rounded flex items-center justify-center font-bold",
                            itemColor.accent
                          )}>
                            {globalIndex + 1}
                          </div>

                          {/* Playing indicator */}
                          {isActive && isPlaying && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                                <Play className="w-4 h-4 text-black fill-black" />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Name */}
                        <div className="p-1.5">
                          <div className="flex items-center gap-1">
                            {item.media?.type === 'video' ? (
                              <Video className="w-3 h-3 text-muted-foreground shrink-0" />
                            ) : (
                              <Image className="w-3 h-3 text-muted-foreground shrink-0" />
                            )}
                            <p className="text-[10px] font-medium truncate" title={item.media?.name}>
                              {item.media?.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer hint */}
      <div className="shrink-0 border-t bg-muted/20 px-4 py-2 text-center">
        <p className="text-xs text-muted-foreground">
          Clique em um canal para editar ou arraste para reordenar
        </p>
      </div>
    </div>
  );
};