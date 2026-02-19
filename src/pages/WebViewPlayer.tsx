import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { db } from "@/services/firebase";
import { ref, onValue } from "firebase/database";
import { usePlayerFaceDetection } from "@/hooks/usePlayerFaceDetection";
import { setupKioskMode } from "@/utils/nativeBridge";
import { Capacitor } from "@capacitor/core";
import { useOfflinePlayer } from "@/hooks/useOfflinePlayer";
import { useAutoHideControls, useFullscreen, useKeyboardShortcuts, useMediaRotation, useClock } from "@/hooks/player";
import {
  MediaRenderer,
  PlayerProgressBar,
  PlayerControls,
  LoadingScreen,
  EmptyContentScreen,
  DownloadScreen,
} from "@/components/player-core";
import {
  Bell,
  Camera,
  Users,
  WifiOff,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const WebViewPlayer = () => {
  const { deviceCode: paramDeviceCode } = useParams<{ deviceCode: string }>();
  const [searchParams] = useSearchParams();
  const deviceCode = paramDeviceCode || searchParams.get("device_id") || searchParams.get("id");

  const {
    deviceState,
    isLoading,
    isSyncing,
    syncError,
    downloadProgress,
    getActiveItems,
    getActivePlaylist,
    syncWithServer,
  } = useOfflinePlayer(deviceCode || "");

  const { showControls } = useAutoHideControls();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { formattedTime } = useClock();

  const [transitionState, setTransitionState] = useState<"visible" | "fading">("visible");
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");

  const items = getActiveItems();
  const activePlaylist = getActivePlaylist();
  const isOnline = deviceState?.is_online ?? navigator.onLine;

  // Media rotation
  const firstItem = items[0];

  // Helper para calcular duração efetiva de um item.
  // Vídeos sem override retornam 0 (avançam via onEnded).
  // Imagens usam duration do banco com fallback de 10s.
  const getItemDuration = (item: typeof firstItem) => {
    if (!item) return 10;
    if (item.duration_override && item.duration_override > 0) return item.duration_override;
    if (item.media?.type === "video") return 0; // usa onEnded
    return item.media?.duration || 10;
  };

  const isFirstVideo = firstItem?.media?.type === "video";

  const { currentIndex, goToNext, goToPrev, progressPercent, timeRemaining } = useMediaRotation({
    itemsLength: items.length,
    currentDuration: getItemDuration(firstItem),
    isVideo: isFirstVideo,
    enabled: items.length > 0,
    onFadeStart: () => setTransitionState("fading"),
    fadeBeforeMs: 500,
  });

  // Reset transition on index change
  useEffect(() => {
    setTransitionState("visible");
  }, [currentIndex]);

  // Derive active media from current index
  const activeItem = items[currentIndex] || null;
  const activeMedia = activeItem?.media;

  // Face detection
  const currentContentInfo = useMemo(() => {
    if (!activeMedia || !activePlaylist) return null;
    return {
      contentId: activeMedia.id,
      contentName: activeMedia.name,
      playlistId: activePlaylist.id,
    };
  }, [activeMedia, activePlaylist]);

  const { activeFaces, isModelsLoaded: faceModelsLoaded } = usePlayerFaceDetection(
    deviceCode || "",
    !!deviceState?.camera_enabled,
    currentContentInfo
  );

  useKeyboardShortcuts({
    onFullscreen: toggleFullscreen,
    onSync: syncWithServer,
    onNext: goToNext,
    onPrev: goToPrev,
    itemsLength: items.length,
  });

  // Firebase listener
  useEffect(() => {
    if (!deviceCode) return;
    const deviceRef = ref(db, `${deviceCode}`);
    const unsubscribe = onValue(deviceRef, (snapshot) => {
      const data = snapshot.val();
      if (data && (data["last-update"] || data["atualizacao_plataforma"] === "true")) {
        setUpdateMessage("Nova atualização recebida!");
        setShowUpdateNotification(true);
        syncWithServer();
        setTimeout(() => setShowUpdateNotification(false), 3000);
      }
    });
    return () => unsubscribe();
  }, [deviceCode, syncWithServer]);

  // Kiosk mode
  useEffect(() => {
    if (Capacitor.isNativePlatform()) setupKioskMode();
  }, []);

  // State screens
  if (isLoading && !deviceState) {
    return <LoadingScreen subMessage={`Dispositivo: ${deviceCode}`} />;
  }

  if (isSyncing && !deviceState && downloadProgress.total > 0) {
    return (
      <DownloadScreen
        downloaded={downloadProgress.downloaded}
        total={downloadProgress.total}
        current={downloadProgress.current}
      />
    );
  }

  if (!activePlaylist || items.length === 0) {
    return (
      <EmptyContentScreen
        deviceName={deviceState?.device_name || deviceCode || undefined}
        syncError={syncError}
        onSync={syncWithServer}
        isSyncing={isSyncing}
      />
    );
  }

  if (!activeMedia) return null;

  const mediaUrl = activeMedia.blob_url || activeMedia.file_url;

  // Próximo item para pré-carregamento
  const nextItem = items[(currentIndex + 1) % items.length];
  const nextMedia = nextItem?.media;
  const nextMediaUrl = nextMedia?.blob_url || nextMedia?.file_url || undefined;

  const getObjectFit = (): "cover" | "contain" | "fill" => {
    switch (activePlaylist?.content_scale) {
      case "contain": return "contain";
      case "fill": return "fill";
      case "cover": default: return "cover";
    }
  };

  return (
    <div className="relative min-h-screen bg-black overflow-hidden select-none">
      {/* Update notification */}
      <div className={cn(
        "absolute top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500",
        showUpdateNotification ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
      )}>
        <div className="flex items-center gap-3 bg-primary/90 backdrop-blur-md text-primary-foreground px-6 py-3 rounded-full shadow-2xl">
          <Bell className="w-5 h-5 animate-pulse" />
          <span className="font-medium">{updateMessage}</span>
        </div>
      </div>

      {/* Media */}
      <div className="relative w-full h-screen">
        <MediaRenderer
          media={activeMedia}
          mediaUrl={mediaUrl || ""}
          objectFit={getObjectFit()}
          transitionClass={cn(
            "transition-opacity duration-500",
            transitionState === "fading" ? "opacity-0" : "opacity-100"
          )}
          onEnded={goToNext}
          nextMediaUrl={nextMediaUrl}
          onImageError={(e) => {
            if ((e.target as HTMLImageElement).src !== activeMedia.file_url) {
              (e.target as HTMLImageElement).src = activeMedia.file_url;
            }
          }}
        />
      </div>

      <PlayerProgressBar progressPercent={progressPercent} />

      <PlayerControls
        visible={showControls}
        deviceName={deviceState?.device_name || deviceCode || undefined}
        playlistName={activePlaylist.name}
        isOnline={isOnline}
        isFullscreen={isFullscreen}
        isSyncing={isSyncing}
        formattedTime={formattedTime}
        onToggleFullscreen={toggleFullscreen}
        onSync={syncWithServer}
        showClock
        showSyncButton
      />

      {/* Media info */}
      <div className={cn(
        "absolute bottom-6 left-6 bg-black/60 backdrop-blur-sm rounded-lg p-3 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        <div className="flex items-center gap-2">
          {activeMedia.blob_url && <CheckCircle2 className="w-4 h-4 text-green-400" />}
          <div>
            <p className="text-white font-medium text-sm">{activeMedia.name}</p>
            <p className="text-white/60 text-xs">
              {currentIndex + 1} de {items.length} • {Math.ceil(timeRemaining / 1000)}s
            </p>
          </div>
        </div>
      </div>

      {/* Offline badge */}
      {!isOnline && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-yellow-500/20 rounded-full px-3 py-1">
          <WifiOff className="w-3 h-3 text-yellow-400" />
          <span className="text-yellow-200 text-xs">Offline</span>
        </div>
      )}

      {/* Face detection indicator */}
      <div className={cn(
        "absolute bottom-6 right-6 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg p-3 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0"
      )}>
        <Camera className={cn(
          "w-4 h-4",
          faceModelsLoaded ? "text-green-400" : "text-yellow-400 animate-pulse"
        )} />
        {activeFaces.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-white text-sm font-medium">{activeFaces.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebViewPlayer;
