import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOfflinePlayer } from "@/hooks/useOfflinePlayer";
import { useProductLookup } from "@/hooks/useProductLookup";
import { useProductDisplaySettingsBySlug } from "@/hooks/useProductDisplaySettings";
import { ProductLookupContainer } from "@/components/player/ProductLookupContainer";
import { EanInput } from "@/components/player/EanInput";
import { useDeviceMonitor } from "@/hooks/useDeviceMonitor";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { useTerminalMetrics } from "@/hooks/useTerminalMetrics";
import { useTerminalAI } from "@/hooks/useTerminalAI";
import { usePeopleCounter } from "@/hooks/usePeopleCounter";
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
  TerminalModeSwitcher,
  AIAssistantOverlay,
  MetricsOverlay,
  FacialRecognitionOverlay,
  LoyaltyOverlay,
  PeopleCounterOverlay,
  TerminalSettingsOverlay,
  DeviceSimulator,
} from "@/components/smart-terminal";
import type { TerminalMode } from "@/components/smart-terminal";
import type { TerminalTheme } from "@/components/smart-terminal/TerminalSettingsOverlay";
import type { SimulationMode } from "@/components/smart-terminal/DeviceSimulator";
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

const OfflinePlayer = () => {
  const { deviceCode } = useParams<{ deviceCode: string }>();
  const navigate = useNavigate();

  // Core hooks
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

  // Camera & face detection
  const { videoRef: cameraVideoRef, canvasRef: cameraCanvasRef } = useDeviceMonitor(deviceCode || "");
  const faceVideoRef = useRef<HTMLVideoElement>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);

  // Terminal state
  const [terminalMode, setTerminalMode] = useState<TerminalMode>("player");
  const [theme, setTheme] = useState<TerminalTheme>(() => {
    const saved = localStorage.getItem(`terminal_theme_${deviceCode}`);
    return (saved as TerminalTheme) || "supermarket";
  });

  // Face detection for overlays
  const { activeFaces } = useFaceDetection(faceVideoRef, faceCanvasRef, terminalMode === "facial" || terminalMode === "counter" || terminalMode === "loyalty");

  // Metrics
  const { metrics, trackEvent } = useTerminalMetrics(deviceCode || "");

  // AI Assistant
  const { messages: aiMessages, isLoading: aiLoading, sendMessage: aiSend, clearHistory: aiClear } = useTerminalAI(deviceCode || "");

  // People counter
  const { count: peopleCount, todayCount, processFaces } = usePeopleCounter();

  // Player UI hooks
  const { showControls } = useAutoHideControls();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { formattedTime, formattedDate } = useClock();

  // Playlists
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

  // Media rotation
  const firstItem = items[0];
  const firstMedia = firstItem?.media;
  const defaultDuration = displayOverrideMedia
    ? (overrideMedia?.duration || 10)
    : (firstItem?.duration_override || firstMedia?.duration || 10);

  const { currentIndex, goToNext, goToPrev, progressPercent, timeRemaining } = useMediaRotation({
    itemsLength: items.length,
    currentDuration: defaultDuration,
    isVideo: firstMedia?.type === "video",
    enabled: terminalMode === "player" && !displayOverrideMedia && items.length > 0,
  });

  const activeItem = items[currentIndex] || null;
  const activeMedia = displayOverrideMedia ? overrideMedia : activeItem?.media;

  // Track media views
  useEffect(() => {
    if (activeMedia && terminalMode === "player") {
      trackEvent({ type: "media_view", media_id: activeMedia.id, duration: defaultDuration });
    }
  }, [currentIndex, activeMedia?.id]);

  // Process faces for counter
  useEffect(() => {
    if (activeFaces.length > 0) {
      processFaces(activeFaces);
      activeFaces.forEach(face => {
        trackEvent({ type: "face_detected" });
        if (face.isRegistered) trackEvent({ type: "face_recognized" });
      });
    }
  }, [activeFaces.length]);

  // Initialize face camera when entering facial/counter/loyalty mode
  useEffect(() => {
    if (terminalMode === "facial" || terminalMode === "counter" || terminalMode === "loyalty") {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480, facingMode: "user" },
          });
          if (faceVideoRef.current) {
            faceVideoRef.current.srcObject = stream;
            faceVideoRef.current.play().catch(() => {});
          }
        } catch (err) {
          console.warn("Camera not available:", err);
        }
      };
      startCamera();

      return () => {
        const stream = faceVideoRef.current?.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      };
    }
  }, [terminalMode]);

  // Save theme
  useEffect(() => {
    localStorage.setItem(`terminal_theme_${deviceCode}`, theme);
  }, [theme, deviceCode]);

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
      setTerminalMode("product");
      trackEvent({ type: "product_lookup" });
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
    setTerminalMode("player");
    clearProduct();
  }, [clearProduct]);

  const handleEanSubmit = useCallback((ean: string) => {
    lookupProduct(ean);
  }, [lookupProduct]);

  const handleReset = useCallback(async () => {
    toast.loading("Limpando dados...", { id: "reset" });
    try {
      await clearAllData();
      toast.success("Dados limpos!", { id: "reset" });
      setTimeout(() => navigate(`/setup/${deviceCode}`), 1000);
    } catch {
      toast.error("Erro ao limpar dados", { id: "reset" });
    }
  }, [clearAllData, navigate, deviceCode]);

  const handleModeChange = useCallback((mode: TerminalMode) => {
    if (mode === "product") {
      // Product mode is triggered by EAN scan, not menu
      return;
    }
    setTerminalMode(mode);
  }, []);

  // Simulation mode derivation
  const simulationMode: SimulationMode = (() => {
    if (!deviceState?.is_online) return "offline";
    if (terminalMode === "facial" && activeFaces.length > 0) return "recognizing";
    if (terminalMode === "product") return "product_lookup";
    if (terminalMode === "loyalty" && activeFaces.some(f => f.isRegistered)) return "personalized_offer";
    if (items.length === 0 && terminalMode === "player") return "idle";
    return "connected";
  })();

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

  if (!displayOverrideMedia && (!activePlaylist || items.length === 0) && terminalMode === "player") {
    const debugInfo = activePlaylist
      ? `Playlist "${activePlaylist.name}" ativa, mas ${activePlaylist.has_channels ? "nenhum canal ativo" : "sem itens"}`
      : `${deviceState?.playlists?.length || 0} playlists em cache`;

    return (
      <div className="relative">
        <EmptyContentScreen
          deviceName={deviceState?.device_name || deviceCode}
          syncError={syncError}
          onSync={syncWithServer}
          isSyncing={isSyncing}
          debugInfo={debugInfo}
        />
        <TerminalModeSwitcher
          activeMode={terminalMode}
          onModeChange={handleModeChange}
          visible={true}
          peopleCount={todayCount}
          facesDetected={activeFaces.length}
        />
      </div>
    );
  }

  const displayMediaUrl = displayOverrideMedia
    ? (overrideMedia?.blob_url || overrideMedia?.file_url || "")
    : (activeItem?.media?.blob_url || activeItem?.media?.file_url || "");

  const isOverlayActive = terminalMode !== "player" && terminalMode !== "product";

  return (
    <div className="relative min-h-screen bg-black overflow-hidden select-none">
      {/* Barcode scanner - always active in player mode */}
      <EanInput
        isVisible={terminalMode === "player"}
        onSubmit={handleEanSubmit}
        disabled={false}
        onReset={handleReset}
        alwaysListenForScanner={true}
      />

      {/* Product lookup overlay */}
      {terminalMode === "product" && (
        <ProductLookupContainer
          product={product}
          isLoading={isProductLoading}
          error={productError}
          onDismiss={handleDismissProduct}
          timeout={15}
          displaySettings={displaySettings || undefined}
        />
      )}

      {/* Override media badge */}
      {displayOverrideMedia && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-orange-500/90 backdrop-blur-sm rounded-full px-4 py-2">
          <AlertCircle className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-medium">Mídia Avulsa</span>
        </div>
      )}

      {/* Device simulation indicator */}
      <DeviceSimulator mode={simulationMode} visible={terminalMode === "player" && showControls} />

      {/* Media player background */}
      <div className={cn(
        "relative w-full h-screen transition-opacity duration-300",
        (terminalMode === "product" || isOverlayActive) ? "opacity-20 pointer-events-none" : "opacity-100"
      )}>
        {activeMedia && (
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
        )}
      </div>

      {/* Progress bar */}
      {terminalMode === "player" && !displayOverrideMedia && (
        <PlayerProgressBar progressPercent={progressPercent} />
      )}

      {/* Player controls */}
      {terminalMode === "player" && (
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

      {/* Media info */}
      {terminalMode === "player" && activeMedia && (
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

      {/* Media indicators */}
      {terminalMode === "player" && !displayOverrideMedia && (
        <MediaIndicators
          total={items.length}
          currentIndex={currentIndex}
          visible={showControls}
          activeColor="bg-primary"
        />
      )}

      {/* Sync indicator */}
      {isSyncing && terminalMode === "player" && (
        <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
          <RefreshCw className="w-4 h-4 text-primary animate-spin" />
          <span className="text-white text-sm">Sincronizando...</span>
        </div>
      )}

      {/* Offline indicator */}
      {!deviceState?.is_online && terminalMode === "player" && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm rounded-full px-4 py-1.5">
          <WifiOff className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-200 text-sm">Modo Offline</span>
        </div>
      )}

      {/* Last sync */}
      {deviceState?.last_sync && terminalMode === "player" && (
        <div className={cn(
          "absolute bottom-10 left-1/2 -translate-x-1/2 text-white/40 text-xs transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}>
          <Clock className="w-3 h-3 inline mr-1" />
          Última sinc.: {new Date(deviceState.last_sync).toLocaleTimeString("pt-BR")}
        </div>
      )}

      {/* === MODULE OVERLAYS === */}

      <AIAssistantOverlay
        visible={terminalMode === "assistant"}
        messages={aiMessages}
        isLoading={aiLoading}
        onSend={(text) => {
          trackEvent({ type: "assistant_interaction" });
          aiSend(text);
        }}
        onClear={aiClear}
        onClose={() => setTerminalMode("player")}
      />

      <MetricsOverlay
        visible={terminalMode === "metrics"}
        metrics={metrics}
        onClose={() => setTerminalMode("player")}
      />

      <FacialRecognitionOverlay
        visible={terminalMode === "facial"}
        activeFaces={activeFaces}
        videoRef={faceVideoRef}
        canvasRef={faceCanvasRef}
        onClose={() => setTerminalMode("player")}
      />

      <LoyaltyOverlay
        visible={terminalMode === "loyalty"}
        activeFaces={activeFaces}
        onClose={() => setTerminalMode("player")}
      />

      <PeopleCounterOverlay
        visible={terminalMode === "counter"}
        count={peopleCount}
        todayCount={todayCount}
        activeFaces={activeFaces}
        onClose={() => setTerminalMode("player")}
      />

      <TerminalSettingsOverlay
        visible={terminalMode === "settings"}
        theme={theme}
        onThemeChange={setTheme}
        deviceCode={deviceCode}
        isOnline={deviceState?.is_online}
        onSync={syncWithServer}
        onReset={handleReset}
        onClose={() => setTerminalMode("player")}
      />

      {/* Mode switcher sidebar */}
      <TerminalModeSwitcher
        activeMode={terminalMode}
        onModeChange={handleModeChange}
        visible={showControls || isOverlayActive}
        peopleCount={todayCount}
        facesDetected={activeFaces.length}
      />

      {/* Hidden camera for device monitor */}
      <div className="hidden">
        <video ref={cameraVideoRef} autoPlay muted playsInline />
        <canvas ref={cameraCanvasRef} />
      </div>

      {/* Hidden face camera refs (shown in overlay) */}
      {terminalMode !== "facial" && (
        <div className="hidden">
          <video ref={faceVideoRef} autoPlay muted playsInline />
          <canvas ref={faceCanvasRef} />
        </div>
      )}
    </div>
  );
};

export default OfflinePlayer;
