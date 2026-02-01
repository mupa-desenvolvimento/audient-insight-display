import { PlaylistChannel } from "@/hooks/usePlaylistChannels";
import { cn } from "@/lib/utils";
import { Clock, Shield, Play } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

  const getChannelColor = (channel: PlaylistChannel) => {
    if (channel.is_fallback) return "bg-yellow-500/80 border-yellow-400";
    if (isChannelActive(channel)) return "bg-green-500/80 border-green-400";
    return "bg-primary/70 border-primary";
  };

  // Group channels by row (simple algorithm to avoid overlaps)
  const getChannelRow = (channel: PlaylistChannel, index: number): number => {
    // Simple: just stack them vertically
    return index;
  };

  const currentTimePosition = getCurrentTimePosition();

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="w-4 h-4" />
          Timeline de Programação (24h)
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/70" />
            <span>Programado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500/80" />
            <span>Ao Vivo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500/80" />
            <span>Fallback</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Hour markers */}
        <div className="flex border-b h-8">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="flex-1 border-r border-border/50 text-xs text-muted-foreground flex items-center justify-center"
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {/* Channels area */}
        <div
          className="relative"
          style={{ minHeight: Math.max(channels.length * 40 + 20, 80) }}
        >
          {/* Hour grid lines */}
          <div className="absolute inset-0 flex pointer-events-none">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex-1 border-r border-border/30"
              />
            ))}
          </div>

          {/* Current time indicator */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
            style={{ left: `${currentTimePosition}%` }}
          >
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
          </div>

          {/* Channel blocks */}
          <TooltipProvider>
            {channels.map((channel, index) => {
              const style = getChannelStyle(channel);
              const row = getChannelRow(channel, index);
              const colorClass = getChannelColor(channel);
              const isSelected = activeChannelId === channel.id;

              if (style.isOvernight) {
                // Render two blocks for overnight schedules
                return (
                  <div key={channel.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute h-8 rounded border cursor-pointer transition-all flex items-center px-2 gap-1 overflow-hidden",
                            colorClass,
                            isSelected && "ring-2 ring-white"
                          )}
                          style={{
                            left: `${style.firstBlock.left}%`,
                            width: `${style.firstBlock.width}%`,
                            top: row * 40 + 10,
                          }}
                          onClick={() => onSelectChannel(channel)}
                        >
                          {channel.is_fallback && <Shield className="w-3 h-3 shrink-0" />}
                          {isChannelActive(channel) && <Play className="w-3 h-3 shrink-0" />}
                          <span className="text-xs font-medium truncate text-white">
                            {channel.name}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{channel.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {channel.start_time.slice(0, 5)} – {channel.end_time.slice(0, 5)}
                        </p>
                        <p className="text-xs">{channel.item_count || 0} mídias</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            "absolute h-8 rounded border cursor-pointer transition-all flex items-center px-2 gap-1 overflow-hidden",
                            colorClass,
                            isSelected && "ring-2 ring-white"
                          )}
                          style={{
                            left: `${style.secondBlock.left}%`,
                            width: `${style.secondBlock.width}%`,
                            top: row * 40 + 10,
                          }}
                          onClick={() => onSelectChannel(channel)}
                        >
                          <span className="text-xs font-medium truncate text-white">
                            (cont.)
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{channel.name} (continuação)</p>
                        <p className="text-xs text-muted-foreground">
                          {channel.start_time.slice(0, 5)} – {channel.end_time.slice(0, 5)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              }

              return (
                <Tooltip key={channel.id}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "absolute h-8 rounded border cursor-pointer transition-all flex items-center px-2 gap-1 overflow-hidden",
                        colorClass,
                        isSelected && "ring-2 ring-white"
                      )}
                      style={{
                        left: `${style.left}%`,
                        width: `${Math.max(style.width, 2)}%`,
                        top: row * 40 + 10,
                      }}
                      onClick={() => onSelectChannel(channel)}
                    >
                      {channel.is_fallback && <Shield className="w-3 h-3 shrink-0" />}
                      {isChannelActive(channel) && <Play className="w-3 h-3 shrink-0" />}
                      <span className="text-xs font-medium truncate text-white">
                        {channel.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{channel.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {channel.start_time.slice(0, 5)} – {channel.end_time.slice(0, 5)}
                    </p>
                    <p className="text-xs">{channel.item_count || 0} mídias</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>

          {/* Empty state */}
          {channels.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              Nenhum canal programado
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
