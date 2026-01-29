import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff, Wifi, CloudOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
}

export function OfflineIndicator({ className, showWhenOnline = false }: OfflineIndicatorProps) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected && !showWhenOnline) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg transition-all duration-300",
        isOnline
          ? showReconnected
            ? "bg-green-500/90 text-white"
            : "bg-muted text-muted-foreground"
          : "bg-destructive text-destructive-foreground animate-pulse",
        className
      )}
    >
      {isOnline ? (
        showReconnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Conexão restaurada</span>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Online</span>
          </>
        )
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Modo Offline</span>
        </>
      )}
    </div>
  );
}

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium">
      <CloudOff className="w-4 h-4 inline-block mr-2" />
      Você está offline. Algumas funcionalidades podem estar limitadas.
    </div>
  );
}
