import { useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOfflinePlayer } from "@/hooks/useOfflinePlayer";
import { useProductLookup } from "@/hooks/useProductLookup";
import { useProductDisplaySettingsBySlug } from "@/hooks/useProductDisplaySettings";
import { ProductLookupContainer } from "@/components/player/ProductLookupContainer";
import { EanInput } from "@/components/player/EanInput";
import { useDeviceMonitor } from "@/hooks/useDeviceMonitor";
import { useAutoHideControls, useFullscreen, useKeyboardShortcuts, useMediaRotation, useClock } from "@/hooks/player";
import {
  MediaRenderer,
  PlayerProgressBar,
  MediaIndicators,
  PlayerControls,
  LoadingScreen,
  BlockedScreen,
  EmptyContentScreen,
  DownloadScreen,
} from "@/components/player-core";
import {
  AlertCircle,
  RefreshCw,
  Video,
  Image as ImageIcon,
  Clock,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PlayerMode = "media" | "product" | "blocked" | "override";

const OfflinePlayer = () => {
  const { deviceCode } = useParams<{ deviceCode: string }>();
  const navigate = useNavigate();
  const {
    deviceState,
    isLoading,
    isSyncing,
    syncError,
    downloadProgress,
    getActivePlaylist,
    getActiveItems,
    getActiveChannel,
    syncWithServer,
    isPlaylistActiveNow,
    clearAllData,
  } = useOfflinePlayer(deviceCode || "");

  const { videoRef: cameraVideoRef, canvasRef: cameraCanvasRef } = useDeviceMonitor(deviceCode || "");
  const [playerMode, setPlayerMode] = useState<PlayerMode>("media");
  const { showControls } = useAutoHideControls();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { formattedTime, formattedDate } = useClock();

  const activePlaylist = getActivePlaylist();
  const activeChannel = activePlaylist?.has_channels ? getActiveChannel(activePlaylist) : null;
  const items = getActiveItems();

  // Override media check
  const hasActiveOverrideMedia = (() => {
    if (!deviceState?.override_media) return false;
    const expiresAt = new Date(deviceState.override_media.expires_at);
    return expiresAt > new Date();
  })();
  const overrideMedia = hasActiveOverrideMedia ? deviceState?.override_media : null;
  const displayOverrideMedia = hasActiveOverrideMedia && overrideMedia;

  // Media rotation - must be called before using currentIndex
  const firstItem = items[0];
  const firstMedia = firstItem?.media;
  const defaultDuration = displayOverrideMedia
    ? (overrideMedia?.duration || 10)
    : (firstItem?.duration_override || firstMedia?.duration || 10);

  const { currentIndex, goToNext, goToPrev, progressPercent, timeRemaining } = useMediaRotation({
    itemsLength: items.length,
    currentDuration: defaultDuration,
    isVideo: firstMedia?.type === "video",
    enabled: playerMode === "media" && !displayOverrideMedia && items.length > 0,
  });

  // Derive active media from current index
  const activeItem = items[currentIndex] || null;
  const activeMedia = displayOverrideMedia ? overrideMedia : activeItem?.media;

  // Product lookup
  const mediaTimerRef = useRef<NodeJS.Timeout | null>(null);
  const {
    product,
    isLoading: isProductLoading,
    error: productError,
    lookupProduct,
    clearProduct,
  } = useProductLookup({
    deviceCode: deviceCode || "",
    onLookupStart: () => {
      setPlayerMode("product");
      if (mediaTimerRef.current) clearTimeout(mediaTimerRef.current);
    },
  });

  const { data: displaySettings } = useProductDisplaySettingsBySlug(deviceState?.company_slug);

  useKeyboardShortcuts({
    onFullscreen: toggleFullscreen,
    onSync: syncWithServer,
    onNext: goToNext,
    onPrev: goToPrev,
    itemsLength: items.length,
  });

  const handleDismissProduct = useCallback(() => {
    setPlayerMode("media");
    clearProduct();
  }, [clearProduct]);

  const handleEanSubmit = useCallback((ean: string) => {
    lookupProduct(ean);
  }, [lookupProduct]);

  const handleReset = useCallback(async () => {
    toast.loading("Limpando dados...", { id: "reset" });
    try {
      await clearAllData();
      toast.success("Dados limpos com sucesso!", { id: "reset" });
      setTimeout(() => navigate(`/setup/${deviceCode}`), 1000);
    } catch {
      toast.error("Erro ao limpar dados", { id: "reset" });
    }
  }, [clearAllData, navigate, deviceCode]);

  const isDeviceBlocked = deviceState?.is_blocked === true;

  // State screens
  if (isLoading && !deviceState) {
    return <LoadingScreen subMessage={`Dispositivo: ${deviceCode}`} />;
  }

  if (isDeviceBlocked) {
    return (
      <BlockedScreen
        message={deviceState?.blocked_message || undefined}
        deviceName={deviceState?.device_name || deviceCode}
        onCheckStatus={syncWithServer}
        isChecking={isSyncing}
      />
    );
  }

  if (isSyncing && downloadProgress.total > 0 && downloadProgress.downloaded < downloadProgress.total) {
    return (
      <DownloadScreen
        downloaded={downloadProgress.downloaded}
        total={downloadProgress.total}
        current={downloadProgress.current}
      />
    );
  }

  if (!displayOverrideMedia && (!activePlaylist || items.length === 0)) {
    const debugInfo = activePlaylist
      ? `Playlist "${activePlaylist.name}" ativa, mas ${activePlaylist.has_channels ? "nenhum canal ativo" : "sem itens"}`
      : `${deviceState?.playlists?.length || 0} playlists em cache`;

    return (
      <EmptyContentScreen
        deviceName={deviceState?.device_name || deviceCode}
        syncError={syncError}
        onSync={syncWithServer}
        isSyncing={isSyncing}
        debugInfo={debugInfo}
      />
    );
  }

  if (!activeMedia) return null;

  const displayMediaUrl = displayOverrideMedia
    ? (overrideMedia?.blob_url || overrideMedia?.file_url || "")
    : (activeItem?.media?.blob_url || activeItem?.media?.file_url || "");

  return (
    <div className="relative min-h-screen bg-black overflow-hidden select-none">
      <EanInput
        isVisible={playerMode === "media"}
        onSubmit={handleEanSubmit}
        disabled={false}
        onReset={handleReset}
        alwaysListenForScanner={true}
      />

      {playerMode === "product" && (
        <ProductLookupContainer
          product={product}
          isLoading={isProductLoading}
          error={productError}
          onDismiss={handleDismissProduct}
          timeout={15}
          displaySettings={displaySettings || undefined}
        />
      )}

      {displayOverrideMedia && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-orange-500/90 backdrop-blur-sm rounded-full px-4 py-2">
          <AlertCircle className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-medium">Mídia Avulsa</span>
        </div>
      )}

      <div className={cn(
        "relative w-full h-screen transition-opacity duration-300",
        playerMode === "product" ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        <MediaRenderer
          media={activeMedia}
          mediaUrl={displayMediaUrl}
          objectFit="contain"
          loop={!!displayOverrideMedia}
          onEnded={!displayOverrideMedia ? goToNext : undefined}
          onImageError={(e) => {
            const fallbackUrl = displayOverrideMedia ? overrideMedia?.file_url : activeItem?.media?.file_url;
            if (fallbackUrl && (e.target as HTMLImageElement).src !== fallbackUrl) {
              (e.target as HTMLImageElement).src = fallbackUrl;
            }
          }}
        />
      </div>

      {playerMode === "media" && !displayOverrideMedia && (
        <PlayerProgressBar progressPercent={progressPercent} />
      )}

      {playerMode === "media" && (
        <PlayerControls
          visible={showControls}
          deviceName={deviceState?.device_name || deviceCode}
          playlistName={activePlaylist?.name}
          channelName={activeChannel?.name}
          isOnline={deviceState?.is_online}
          isFullscreen={isFullscreen}
          isSyncing={isSyncing}
          formattedTime={formattedTime}
          formattedDate={formattedDate}
          onToggleFullscreen={toggleFullscreen}
          onSync={syncWithServer}
          showClock
          showSyncButton
        />
      )}

      {playerMode === "media" && (
        <div className={cn(
          "absolute bottom-6 left-6 bg-black/60 backdrop-blur-sm rounded-lg p-3 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}>
          <div className="flex items-center gap-3">
            {activeMedia?.type === "video" ? (
              <Video className="w-5 h-5 text-primary" />
            ) : (
              <ImageIcon className="w-5 h-5 text-primary" />
            )}
            <div>
              <p className="text-white font-medium text-sm">{activeMedia?.name}</p>
              {displayOverrideMedia ? (
                <p className="text-orange-400 text-xs">
                  Mídia avulsa • Expira: {new Date(overrideMedia!.expires_at).toLocaleTimeString("pt-BR")}
                </p>
              ) : (
                <p className="text-white/60 text-xs">
                  {currentIndex + 1} de {items.length} • {Math.ceil(timeRemaining / 1000)}s restantes
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {playerMode === "media" && !displayOverrideMedia && (
        <MediaIndicators
          total={items.length}
          currentIndex={currentIndex}
          visible={showControls}
          activeColor="bg-primary"
        />
      )}

      {isSyncing && playerMode === "media" && (
        <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
          <RefreshCw className="w-4 h-4 text-primary animate-spin" />
          <span className="text-white text-sm">Sincronizando...</span>
        </div>
      )}

      {!deviceState?.is_online && playerMode === "media" && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm rounded-full px-4 py-1.5">
          <WifiOff className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-200 text-sm">Modo Offline</span>
        </div>
      )}

      {deviceState?.last_sync && playerMode === "media" && (
        <div className={cn(
          "absolute bottom-10 left-1/2 -translate-x-1/2 text-white/40 text-xs transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}>
          <Clock className="w-3 h-3 inline mr-1" />
          Última sinc.: {new Date(deviceState.last_sync).toLocaleTimeString("pt-BR")}
        </div>
      )}

      <div className="hidden">
        <video ref={cameraVideoRef} autoPlay muted playsInline />
        <canvas ref={cameraCanvasRef} />
      </div>
    </div>
  );
};

export default OfflinePlayer;
