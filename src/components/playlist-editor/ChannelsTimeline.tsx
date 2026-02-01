import { PlaylistChannel } from "@/hooks/usePlaylistChannels";
import { cn } from "@/lib/utils";
import { Clock, Shield, Play, Radio } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface ChannelsTimelineProps {
  channels: PlaylistChannel[];
  onSelectChannel: (channel: PlaylistChannel) => void;
  activeChannelId: string | null;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Color palette for channels
const CHANNEL_COLORS = [
  { bg: "bg-blue-500/80", border: "border-blue-400", label: "bg-blue-500" },
  { bg: "bg-purple-500/80", border: "border-purple-400", label: "bg-purple-500" },
  { bg: "bg-cyan-500/80", border: "border-cyan-400", label: "bg-cyan-500" },
  { bg: "bg-pink-500/80", border: "border-pink-400", label: "bg-pink-500" },
  { bg: "bg-orange-500/80", border: "border-orange-400", label: "bg-orange-500" },
  { bg: "bg-teal-500/80", border: "border-teal-400", label: "bg-teal-500" },
  { bg: "bg-indigo-500/80", border: "border-indigo-400", label: "bg-indigo-500" },
  { bg: "bg-rose-500/80", border: "border-rose-400", label: "bg-rose-500" },
];

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
      // Split into two blocks
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

  const getChannelColor = (channel: PlaylistChannel, index: number) => {
    if (channel.is_fallback) return { bg: "bg-yellow-500/80", border: "border-yellow-400", label: "bg-yellow-500" };
    if (isChannelActive(channel)) return { bg: "bg-green-500/80", border: "border-green-400", label: "bg-green-500" };
    return CHANNEL_COLORS[index % CHANNEL_COLORS.length];
  };

  const currentTimePosition = getCurrentTimePosition();
  const ROW_HEIGHT = 48;

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
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
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>Fallback</span>
          </div>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="flex">
        {/* Channel Labels (Fixed Left Column) */}
        <div className="w-36 shrink-0 border-r bg-muted/20">
          {/* Hour header spacer */}
          <div className="h-10 border-b flex items-center justify-center text-xs text-muted-foreground font-medium">
            Canais
          </div>
          
          {/* Channel labels */}
          {channels.map((channel, index) => {
            const colors = getChannelColor(channel, index);
            return (
              <div
                key={channel.id}
                className={cn(
                  "border-b flex items-center gap-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors",
                  activeChannelId === channel.id && "bg-muted"
                )}
                style={{ height: ROW_HEIGHT }}
                onClick={() => onSelectChannel(channel)}
              >
                <div className={cn("w-2 h-2 rounded-full shrink-0", colors.label)} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{channel.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {channel.start_time.slice(0, 5)} - {channel.end_time.slice(0, 5)}
                  </p>
                </div>
                {channel.is_fallback && (
                  <Shield className="w-3 h-3 text-yellow-500 shrink-0" />
                )}
                {isChannelActive(channel) && !channel.is_fallback && (
                  <Play className="w-3 h-3 text-green-500 shrink-0" />
                )}
              </div>
            );
          })}
          
          {/* Empty state spacer */}
          {channels.length === 0 && (
            <div className="h-20 flex items-center justify-center text-xs text-muted-foreground">
              Sem canais
            </div>
          )}
        </div>

        {/* Scrollable Timeline Area */}
        <ScrollArea className="flex-1">
          <div className="min-w-[1200px]">
            {/* Hour markers */}
            <div className="flex border-b h-10">
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
                const colors = getChannelColor(channel, index);
                const isSelected = activeChannelId === channel.id;

                return (
                  <div
                    key={channel.id}
                    className={cn(
                      "relative border-b",
                      index % 2 === 0 ? "bg-muted/10" : "bg-transparent"
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
                                  "absolute top-1/2 -translate-y-1/2 h-9 rounded-md border-2 cursor-pointer transition-all flex items-center px-2 gap-1 overflow-hidden shadow-sm hover:shadow-md",
                                  colors.bg,
                                  colors.border,
                                  isSelected && "ring-2 ring-white ring-offset-1 ring-offset-background"
                                )}
                                style={{
                                  left: `${style.firstBlock.left}%`,
                                  width: `${style.firstBlock.width}%`,
                                }}
                                onClick={() => onSelectChannel(channel)}
                              >
                                {channel.is_fallback && <Shield className="w-3 h-3 shrink-0 text-white" />}
                                {isChannelActive(channel) && <Play className="w-3 h-3 shrink-0 text-white" />}
                                <span className="text-xs font-semibold truncate text-white drop-shadow-sm">
                                  {channel.name}
                                </span>
                                <span className="text-[10px] text-white/80 ml-auto shrink-0">
                                  {channel.item_count || 0} mídias
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <div className="space-y-1">
                                <p className="font-semibold">{channel.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Horário: {channel.start_time.slice(0, 5)} – {channel.end_time.slice(0, 5)}
                                </p>
                                <p className="text-xs">{channel.item_count || 0} mídias</p>
                                {channel.is_fallback && (
                                  <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">
                                    Fallback
                                  </Badge>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "absolute top-1/2 -translate-y-1/2 h-9 rounded-md border-2 cursor-pointer transition-all flex items-center px-2 gap-1 overflow-hidden shadow-sm hover:shadow-md",
                                  colors.bg,
                                  colors.border,
                                  isSelected && "ring-2 ring-white ring-offset-1 ring-offset-background"
                                )}
                                style={{
                                  left: `${style.secondBlock.left}%`,
                                  width: `${style.secondBlock.width}%`,
                                }}
                                onClick={() => onSelectChannel(channel)}
                              >
                                <span className="text-xs font-medium truncate text-white">
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
                                "absolute top-1/2 -translate-y-1/2 h-9 rounded-md border-2 cursor-pointer transition-all flex items-center px-2 gap-1 overflow-hidden shadow-sm hover:shadow-md",
                                colors.bg,
                                colors.border,
                                isSelected && "ring-2 ring-white ring-offset-1 ring-offset-background"
                              )}
                              style={{
                                left: `${style.left}%`,
                                width: `${Math.max(style.width, 3)}%`,
                              }}
                              onClick={() => onSelectChannel(channel)}
                            >
                              {channel.is_fallback && <Shield className="w-3 h-3 shrink-0 text-white" />}
                              {isChannelActive(channel) && <Play className="w-3 h-3 shrink-0 text-white" />}
                              <span className="text-xs font-semibold truncate text-white drop-shadow-sm">
                                {channel.name}
                              </span>
                              {style.width > 8 && (
                                <span className="text-[10px] text-white/80 ml-auto shrink-0">
                                  {channel.item_count || 0} mídias
                                </span>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <div className="space-y-1">
                              <p className="font-semibold">{channel.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Horário: {channel.start_time.slice(0, 5)} – {channel.end_time.slice(0, 5)}
                              </p>
                              <p className="text-xs">{channel.item_count || 0} mídias</p>
                              {channel.is_fallback && (
                                <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">
                                  Fallback
                                </Badge>
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
                <div className="h-20 flex items-center justify-center text-muted-foreground text-sm">
                  Crie um canal para visualizar na timeline
                </div>
              )}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Current Time Indicator Label */}
      <div className="px-4 py-2 border-t bg-muted/30 flex items-center gap-2 text-xs">
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
