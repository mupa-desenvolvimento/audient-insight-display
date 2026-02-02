import { PlaylistChannel } from "@/hooks/usePlaylistChannels";
import { cn } from "@/lib/utils";
import { Clock, Shield, Play, Radio, Film, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ChannelsTimelineProps {
  channels: PlaylistChannel[];
  onSelectChannel: (channel: PlaylistChannel) => void;
  activeChannelId: string | null;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const ChannelsTimeline = ({
  channels,
  onSelectChannel,
  activeChannelId,
}: ChannelsTimelineProps) => {
  // Convert time string to minutes from midnight
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes to percentage of 24h
  const minutesToPercent = (minutes: number): number => {
    return (minutes / 1440) * 100;
  };

  // Check if channel is currently active
  const isChannelActive = (channel: PlaylistChannel) => {
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

  // Get current time position
  const getCurrentTimePosition = (): number => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return minutesToPercent(minutes);
  };

  // Calculate channel block position and width
  const getChannelStyle = (channel: PlaylistChannel) => {
    const startMinutes = timeToMinutes(channel.start_time);
    const endMinutes = timeToMinutes(channel.end_time);
    
    // Handle overnight schedules
    if (startMinutes > endMinutes) {
      return {
        isOvernight: true,
        firstBlock: {
          left: minutesToPercent(startMinutes),
          width: minutesToPercent(1440 - startMinutes),
        },
        secondBlock: {
          left: 0,
          width: minutesToPercent(endMinutes),
        },
      };
    }

    return {
      isOvernight: false,
      left: minutesToPercent(startMinutes),
      width: minutesToPercent(endMinutes - startMinutes),
    };
  };

  // Functional color palette based on status
  const getChannelColors = (channel: PlaylistChannel) => {
    if (!channel.is_active) {
      return { 
        bg: "bg-muted/60", 
        border: "border-muted-foreground/30", 
        text: "text-muted-foreground",
        label: "bg-muted"
      };
    }
    if (channel.is_fallback) {
      return { 
        bg: "bg-yellow-500/80", 
        border: "border-yellow-400", 
        text: "text-white",
        label: "bg-yellow-500"
      };
    }
    if (isChannelActive(channel)) {
      return { 
        bg: "bg-green-500/90", 
        border: "border-green-400", 
        text: "text-white",
        label: "bg-green-500"
      };
    }
    // Scheduled (default)
    return { 
      bg: "bg-blue-500/80", 
      border: "border-blue-400", 
      text: "text-white",
      label: "bg-blue-500"
    };
  };

  const getStatusIcon = (channel: PlaylistChannel) => {
    if (!channel.is_active) return <AlertCircle className="w-3.5 h-3.5" />;
    if (channel.is_fallback) return <Shield className="w-3.5 h-3.5" />;
    if (isChannelActive(channel)) return <Play className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  };

  const hasNoMedia = (channel: PlaylistChannel) => !channel.item_count || channel.item_count === 0;

  const currentTimePosition = getCurrentTimePosition();
  const ROW_HEIGHT = 56;

  return (
    <div className="bg-card border rounded-lg overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Radio className="w-4 h-4 text-primary" />
          Timeline de Programação (24h)
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Ao Vivo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>Programado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>Fallback</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-muted border" />
            <span>Inativo</span>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="flex flex-1 min-h-0">
        {/* Channel Labels (Fixed Left Column) */}
        <div className="w-40 shrink-0 border-r bg-muted/20 flex flex-col">
          {/* Hour header spacer */}
          <div className="h-10 border-b flex items-center justify-center text-xs text-muted-foreground font-medium shrink-0">
            Canais
          </div>
          
          {/* Channel labels - scrollable */}
          <ScrollArea className="flex-1">
            {channels.map((channel, index) => {
              const colors = getChannelColors(channel);
              const isLive = isChannelActive(channel);
              const noMedia = hasNoMedia(channel);
              
              return (
                <div
                  key={channel.id}
                  className={cn(
                    "border-b flex items-center gap-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors",
                    activeChannelId === channel.id && "bg-muted",
                    isLive && "bg-green-500/5"
                  )}
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => onSelectChannel(channel)}
                >
                  <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", colors.label)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{channel.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {channel.start_time.slice(0, 5)}–{channel.end_time.slice(0, 5)}
                      </span>
                      <span className={cn(
                        "text-[10px] flex items-center gap-0.5 font-medium",
                        noMedia ? "text-red-500" : "text-muted-foreground"
                      )}>
                        <Film className="w-2.5 h-2.5" />
                        {channel.item_count || 0}
                      </span>
                    </div>
                  </div>
                  {getStatusIcon(channel)}
                </div>
              );
            })}
            
            {/* Empty state spacer */}
            {channels.length === 0 && (
              <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
                Sem canais
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Scrollable Timeline Area */}
        <ScrollArea className="flex-1">
          <div className="min-w-[1200px]">
            {/* Hour markers */}
            <div className="flex border-b h-10 sticky top-0 bg-card z-10">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="flex-1 border-r border-border/50 text-xs text-muted-foreground flex items-center justify-center font-medium"
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Channels rows */}
            <div className="relative">
              {channels.map((channel, index) => {
                const style = getChannelStyle(channel);
                const colors = getChannelColors(channel);
                const isSelected = activeChannelId === channel.id;
                const isLive = isChannelActive(channel);
                const noMedia = hasNoMedia(channel);

                return (
                  <div
                    key={channel.id}
                    className={cn(
                      "relative border-b transition-colors",
                      index % 2 === 0 ? "bg-muted/5" : "bg-transparent",
                      isLive && "bg-green-500/5"
                    )}
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* Hour grid lines */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="flex-1 border-r border-border/20"
                        />
                      ))}
                    </div>

                    {/* Current time indicator */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                      style={{ left: `${currentTimePosition}%` }}
                    />

                    {/* Channel block(s) */}
                    <TooltipProvider>
                      {style.isOvernight ? (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "absolute top-1/2 -translate-y-1/2 h-10 rounded-md border-2 cursor-pointer transition-all flex items-center px-2 gap-1.5 overflow-hidden",
                                  colors.bg,
                                  colors.border,
                                  colors.text,
                                  isSelected && "ring-2 ring-white ring-offset-2 ring-offset-background shadow-lg",
                                  isLive && "shadow-[0_0_16px_rgba(34,197,94,0.3)]",
                                  noMedia && "border-dashed"
                                )}
                                style={{
                                  left: `${style.firstBlock.left}%`,
                                  width: `${style.firstBlock.width}%`,
                                }}
                                onClick={() => onSelectChannel(channel)}
                              >
                                {getStatusIcon(channel)}
                                <span className="text-xs font-semibold truncate drop-shadow-sm">
                                  {channel.name}
                                </span>
                                <span className="text-[10px] opacity-80 ml-auto shrink-0 flex items-center gap-0.5">
                                  <Film className="w-3 h-3" />
                                  {channel.item_count || 0}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <div className="space-y-1">
                                <p className="font-semibold">{channel.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {channel.start_time.slice(0, 5)} – {channel.end_time.slice(0, 5)}
                                </p>
                                <p className="text-xs flex items-center gap-1">
                                  <Film className="w-3 h-3" />
                                  {channel.item_count || 0} mídias
                                </p>
                                {channel.is_fallback && (
                                  <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">
                                    Fallback
                                  </Badge>
                                )}
                                {noMedia && (
                                  <p className="text-xs text-red-500">⚠ Sem mídias configuradas</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "absolute top-1/2 -translate-y-1/2 h-10 rounded-md border-2 cursor-pointer transition-all flex items-center px-2 gap-1 overflow-hidden",
                                  colors.bg,
                                  colors.border,
                                  colors.text,
                                  isSelected && "ring-2 ring-white ring-offset-2 ring-offset-background",
                                  noMedia && "border-dashed"
                                )}
                                style={{
                                  left: `${style.secondBlock.left}%`,
                                  width: `${style.secondBlock.width}%`,
                                }}
                                onClick={() => onSelectChannel(channel)}
                              >
                                <span className="text-xs font-medium truncate">
                                  ↪ {channel.name}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="font-medium">{channel.name} (continuação)</p>
                              <p className="text-xs text-muted-foreground">
                                Horário noturno: {channel.start_time.slice(0, 5)} – {channel.end_time.slice(0, 5)}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "absolute top-1/2 -translate-y-1/2 h-10 rounded-md border-2 cursor-pointer transition-all flex items-center px-2 gap-1.5 overflow-hidden",
                                colors.bg,
                                colors.border,
                                colors.text,
                                isSelected && "ring-2 ring-white ring-offset-2 ring-offset-background shadow-lg",
                                isLive && "shadow-[0_0_16px_rgba(34,197,94,0.3)]",
                                noMedia && "border-dashed"
                              )}
                              style={{
                                left: `${style.left}%`,
                                width: `${Math.max(style.width, 3)}%`,
                              }}
                              onClick={() => onSelectChannel(channel)}
                            >
                              {getStatusIcon(channel)}
                              <span className="text-xs font-semibold truncate drop-shadow-sm">
                                {channel.name}
                              </span>
                              {style.width > 6 && (
                                <span className="text-[10px] opacity-80 ml-auto shrink-0 flex items-center gap-0.5">
                                  <Film className="w-3 h-3" />
                                  {channel.item_count || 0}
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <div className="space-y-1">
                              <p className="font-semibold">{channel.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {channel.start_time.slice(0, 5)} – {channel.end_time.slice(0, 5)}
                              </p>
                              <p className="text-xs flex items-center gap-1">
                                <Film className="w-3 h-3" />
                                {channel.item_count || 0} mídias
                              </p>
                              {channel.is_fallback && (
                                <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">
                                  Fallback
                                </Badge>
                              )}
                              {noMedia && (
                                <p className="text-xs text-red-500">⚠ Sem mídias configuradas</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                  </div>
                );
              })}

              {/* Empty state */}
              {channels.length === 0 && (
                <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                  Crie um canal para visualizar na timeline
                </div>
              )}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Footer with current time */}
      <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-2 text-xs shrink-0">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-muted-foreground">
          Hora atual: {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span className="text-muted-foreground ml-auto">
          {channels.length} {channels.length === 1 ? "canal" : "canais"} programados
        </span>
      </div>
    </div>
  );
};