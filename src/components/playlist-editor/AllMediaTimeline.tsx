import { useMemo } from "react";
import { PlaylistChannel, PlaylistChannelWithItems, PlaylistChannelItem } from "@/hooks/usePlaylistChannels";
import { cn } from "@/lib/utils";
import { Layers, Video, Image, Clock, Film, Radio } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AllMediaTimelineProps {
  channelsWithItems: PlaylistChannelWithItems[];
  onSelectChannel: (channel: PlaylistChannel) => void;
}

// Color palette for channels
const channelColors = [
  { bg: "bg-blue-500/20", border: "border-blue-500/40", accent: "bg-blue-500" },
  { bg: "bg-green-500/20", border: "border-green-500/40", accent: "bg-green-500" },
  { bg: "bg-purple-500/20", border: "border-purple-500/40", accent: "bg-purple-500" },
  { bg: "bg-orange-500/20", border: "border-orange-500/40", accent: "bg-orange-500" },
  { bg: "bg-pink-500/20", border: "border-pink-500/40", accent: "bg-pink-500" },
  { bg: "bg-cyan-500/20", border: "border-cyan-500/40", accent: "bg-cyan-500" },
];

export const AllMediaTimeline = ({
  channelsWithItems,
  onSelectChannel,
}: AllMediaTimelineProps) => {
  // Aggregate all media items from all channels
  const allMediaItems = useMemo(() => {
    const items: { item: PlaylistChannelItem; channel: PlaylistChannelWithItems; channelIndex: number }[] = [];
    
    channelsWithItems.forEach((channel, channelIndex) => {
      if (channel.items && channel.items.length > 0) {
        channel.items.forEach(item => {
          items.push({ item, channel, channelIndex });
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
    return allMediaItems.map(({ item, channel, channelIndex }) => {
      const duration = item.duration_override || item.media?.duration || 8;
      const widthPercent = totalMediaDuration > 0 ? (duration / totalMediaDuration) * 100 : 0;
      const leftPercent = totalMediaDuration > 0 ? (currentOffset / totalMediaDuration) * 100 : 0;
      currentOffset += duration;
      
      return {
        item,
        channel,
        channelIndex,
        duration,
        widthPercent,
        leftPercent,
        color: channelColors[channelIndex % channelColors.length],
      };
    });
  }, [allMediaItems, totalMediaDuration]);

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
                {Math.floor(totalMediaDuration / 60)}:{String(totalMediaDuration % 60).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Summary Bar */}
      <div className="shrink-0 border-b bg-muted/20 px-4 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          {channelsWithItems.map((channel, index) => {
            const color = channelColors[index % channelColors.length];
            const channelDuration = channel.items?.reduce((sum, item) => 
              sum + (item.duration_override || item.media?.duration || 8), 0) || 0;
            const percentage = totalMediaDuration > 0 ? (channelDuration / totalMediaDuration) * 100 : 0;
            
            return (
              <TooltipProvider key={channel.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSelectChannel(channel)}
                      className={cn(
                        "flex items-center gap-1.5 px-2 py-1 rounded text-xs hover:bg-muted/50 transition-colors",
                        color.bg
                      )}
                    >
                      <div className={cn("w-2 h-2 rounded-full", color.accent)} />
                      <span className="font-medium truncate max-w-[100px]">{channel.name}</span>
                      <Badge variant="secondary" className="text-[10px] px-1 h-4">
                        {channel.items?.length || 0}
                      </Badge>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{channel.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {channel.items?.length || 0} mídias • {Math.floor(channelDuration / 60)}:{String(channelDuration % 60).padStart(2, '0')} • {percentage.toFixed(1)}%
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>

      {/* Continuous Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {/* Timeline Progress Bar */}
          <div className="mb-4 bg-muted/30 rounded-lg p-3">
            <div className="flex h-8 rounded overflow-hidden">
              {mediaWithPositions.map(({ item, channel, color, widthPercent, duration }) => (
                <TooltipProvider key={item.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-full border-r border-background/50 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity",
                          color.accent
                        )}
                        style={{ width: `${widthPercent}%`, minWidth: 2 }}
                      >
                        {widthPercent > 5 && (
                          <span className="text-[9px] text-white font-medium truncate px-0.5">
                            {duration}s
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{item.media?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Canal: {channel.name} • {duration}s
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>

          {/* Media Grid by Channel */}
          <div className="space-y-6">
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
                      {items.length} mídias • {Math.floor(channelDuration / 60)}:{String(channelDuration % 60).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Media Items Row */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {items.map(({ item, duration }, index) => (
                      <div
                        key={item.id}
                        className={cn(
                          "shrink-0 rounded-lg border overflow-hidden",
                          color.bg,
                          color.border
                        )}
                        style={{ width: 120 }}
                      >
                        {/* Thumbnail */}
                        <div className="aspect-video bg-muted relative">
                          {item.media?.thumbnail_url ? (
                            <img
                              src={item.media.thumbnail_url}
                              alt={item.media.name}
                              className="w-full h-full object-cover"
                            />
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
                          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 rounded">
                            {duration}s
                          </div>
                          {/* Position badge */}
                          <div className="absolute top-1 left-1 bg-black/70 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                            {index + 1}
                          </div>
                        </div>
                        {/* Name */}
                        <div className="p-1.5">
                          <p className="text-[10px] font-medium truncate" title={item.media?.name}>
                            {item.media?.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
