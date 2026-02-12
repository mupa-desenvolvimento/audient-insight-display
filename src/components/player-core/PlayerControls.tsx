import { cn } from "@/lib/utils";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Maximize,
  Minimize,
  Monitor,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface PlayerControlsProps {
  visible: boolean;
  deviceName?: string;
  playlistName?: string;
  channelName?: string;
  isOnline?: boolean;
  isFullscreen?: boolean;
  isSyncing?: boolean;
  formattedTime?: string;
  formattedDate?: string;
  onToggleFullscreen?: () => void;
  onSync?: () => void;
  backTo?: string;
  showBackButton?: boolean;
  showClock?: boolean;
  showSyncButton?: boolean;
  children?: React.ReactNode;
}

export const PlayerControls = ({
  visible,
  deviceName,
  playlistName,
  channelName,
  isOnline,
  isFullscreen,
  isSyncing,
  formattedTime,
  formattedDate,
  onToggleFullscreen,
  onSync,
  backTo,
  showBackButton = false,
  showClock = false,
  showSyncButton = false,
  children,
}: PlayerControlsProps) => {
  return (
    <div
      className={cn(
        "absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 z-10",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div className="flex justify-between items-start">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {showBackButton && backTo && (
            <Link to={backTo}>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
          )}
          {isOnline !== undefined && (
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                isOnline ? "bg-green-500" : "bg-yellow-500"
              )}
            />
          )}
          <div>
            {deviceName && (
              <div className="flex items-center gap-2 text-white text-sm">
                <Monitor className="w-4 h-4" />
                <span className="font-medium">{deviceName}</span>
              </div>
            )}
            {playlistName && (
              <p className="text-white/60 text-xs">
                {playlistName}{channelName ? ` • ${channelName}` : ""}
              </p>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {showClock && formattedTime && (
            <div className="text-right">
              <p className="text-white text-sm font-mono">{formattedTime}</p>
              {formattedDate && (
                <p className="text-white/60 text-xs">{formattedDate}</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-1">
            {isOnline !== undefined && (
              isOnline ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-yellow-400" />
              )
            )}

            {showSyncButton && onSync && (
              <button
                onClick={onSync}
                disabled={isSyncing}
                className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50"
              >
                <RefreshCw className={cn("w-4 h-4 text-white", isSyncing && "animate-spin")} />
              </button>
            )}

            {onToggleFullscreen && (
              <button
                onClick={onToggleFullscreen}
                className="p-2 hover:bg-white/10 rounded-lg text-white"
              >
                {isFullscreen ? (
                  <Minimize className="w-4 h-4" />
                ) : (
                  <Maximize className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
