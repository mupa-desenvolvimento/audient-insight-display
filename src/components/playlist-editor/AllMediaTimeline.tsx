import { useMemo, useState, useRef, useEffect } from "react";
import { PlaylistChannel, PlaylistChannelWithItems, PlaylistChannelItem } from "@/hooks/usePlaylistChannels";
import { cn } from "@/lib/utils";
import { Video, Image, Clock, Film, Play, Pause, SkipBack, SkipForward, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
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

  // Calculate minimum width per item based on zoom
  const getItemWidth = (widthPercent: number) => {
    const baseMinWidth = 80; // minimum width in pixels
    const scaledWidth = (widthPercent / 100) * (zoom * 8); // Scale based on zoom
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
                  className="max-w-full max-h-[60vh] object-contain"
                  muted
                  autoPlay={isPlaying}
                />
              ) : (
                <img
                  key={currentMedia.item.id}
                  src={currentMedia.item.media?.thumbnail_url || currentMedia.item.media?.file_url || ''}
                  alt={currentMedia.item.media?.name || 'Preview'}
                  className="max-w-full max-h-[60vh] object-contain"
                />
              )}
              
              {/* Fullscreen button */}
              <button className="absolute top-3 right-3 p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors">
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
              
              {/* Media Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {currentMedia.item.media?.type || 'IMAGE'}
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

      {/* Timeline Header */}
      <div className="shrink-0 bg-muted/30 px-4 py-2 flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Timeline</span>
        <span className="text-xs text-muted-foreground">•</span>
        <span className="text-xs text-muted-foreground">{formatTime(totalMediaDuration)}</span>
        <span className="text-xs text-muted-foreground">•</span>
        <span className="text-xs text-muted-foreground">{allMediaItems.length} itens</span>
      </div>

      {/* Timeline - Horizontal thumbnails with proportional widths */}
      <div className="shrink-0 bg-muted/10" ref={timelineRef}>
        <ScrollArea className="w-full">
          <div className="flex p-3 gap-1.5 min-w-max">
            {mediaWithPositions.map(({ item, channel, channelIndex, duration, widthPercent, globalIndex, color }) => {
              const isActive = currentIndex === globalIndex;
              const itemWidth = getItemWidth(widthPercent);
              
              return (
                <TooltipProvider key={item.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleItemClick(globalIndex)}
                        className={cn(
                          "shrink-0 rounded-lg overflow-hidden transition-all relative group",
                          "border-2 hover:border-primary/50",
                          isActive ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                        )}
                        style={{ 
                          width: itemWidth,
                          height: 80 
                        }}
                      >
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
                                <Video className="w-6 h-6 text-muted-foreground" />
                              ) : (
                                <Image className="w-6 h-6 text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Overlay gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                        {/* Channel color indicator */}
                        <div className={cn("absolute top-0 left-0 right-0 h-1", color.accent)} />

                        {/* Type badge */}
                        <Badge 
                          variant="secondary" 
                          className="absolute top-2 left-2 text-[8px] px-1 py-0 h-4 uppercase bg-black/60 text-white border-0"
                        >
                          {item.media?.type === 'video' ? <Video className="w-2.5 h-2.5 mr-0.5" /> : <Image className="w-2.5 h-2.5 mr-0.5" />}
                          {item.media?.type || 'IMG'}
                        </Badge>

                        {/* Name and duration at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 p-1.5">
                          <p className="text-[10px] text-white font-medium truncate leading-tight">
                            {item.media?.name}
                          </p>
                        </div>

                        {/* Play indicator for active item */}
                        {isActive && isPlaying && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                              <Play className="w-3 h-3 text-black fill-black ml-0.5" />
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
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="text-xs">
                        <p className="font-medium">{item.media?.name}</p>
                        <p className="text-muted-foreground">
                          {duration}s • Canal: {channel.name}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
            
            {/* Add button placeholder */}
            <div className="shrink-0 w-14 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors cursor-pointer">
              <span className="text-2xl">+</span>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
};