import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useOfflinePlayer, CachedPlaylistItem } from "@/hooks/useOfflinePlayer";
import { useProductLookup } from "@/hooks/useProductLookup";
import { ProductLookupContainer } from "@/components/player/ProductLookupContainer";
import { EanInput } from "@/components/player/EanInput";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Download, 
  Monitor, 
  AlertCircle,
  Maximize,
  Minimize,
  Clock,
  Image as ImageIcon,
  Video
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

type PlayerMode = "media" | "product";

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
    syncWithServer,
    isPlaylistActiveNow,
    clearAllData,
  } = useOfflinePlayer(deviceCode || "");

  // Estado do player
  const [playerMode, setPlayerMode] = useState<PlayerMode>("media");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Hook de consulta de produtos
  const { 
    product, 
    isLoading: isProductLoading, 
    error: productError, 
    lookupProduct, 
    clearProduct 
  } = useProductLookup({
    deviceCode: deviceCode || "",
    onLookupStart: () => {
      setPlayerMode("product");
      // Pausa o timer de mídia durante a consulta
      if (mediaTimerRef.current) {
        clearTimeout(mediaTimerRef.current);
      }
    }
  });

  const activePlaylist = getActivePlaylist();
  const items = activePlaylist?.items || [];
  const currentItem = items[currentIndex];
  const currentMedia = currentItem?.media;

  // Função para voltar ao modo de mídias
  const handleDismissProduct = useCallback(() => {
    setPlayerMode("media");
    clearProduct();
  }, [clearProduct]);

  // Função para lidar com entrada de EAN
  const handleEanSubmit = useCallback((ean: string) => {
    console.log("[OfflinePlayer] EAN submetido:", ean);
    lookupProduct(ean);
  }, [lookupProduct]);

  // Função para resetar o dispositivo
  const handleReset = useCallback(async () => {
    console.log("[OfflinePlayer] Iniciando reset...");
    toast.loading("Limpando dados...", { id: "reset" });
    
    try {
      await clearAllData();
      toast.success("Dados limpos com sucesso!", { id: "reset" });
      
      // Redireciona para a tela de setup
      setTimeout(() => {
        navigate(`/setup/${deviceCode}`);
      }, 1000);
    } catch (error) {
      console.error("[OfflinePlayer] Erro ao resetar:", error);
      toast.error("Erro ao limpar dados", { id: "reset" });
    }
  }, [clearAllData, navigate, deviceCode]);

  // Atualiza relógio
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Controle de exibição de mídia - só roda quando em modo mídia
  useEffect(() => {
    if (!currentMedia || items.length === 0 || playerMode !== "media") return;

    const duration = (currentItem?.duration_override || currentMedia.duration || 10) * 1000;
    setTimeRemaining(duration);

    // Barra de progresso
    const startTime = Date.now();
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setTimeRemaining(Math.max(0, duration - elapsed));
    }, 100);

    // Timer para próxima mídia
    mediaTimerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, duration);

    return () => {
      if (mediaTimerRef.current) {
        clearTimeout(mediaTimerRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentIndex, currentMedia, currentItem, items.length, playerMode]);

  // Reproduz vídeo automaticamente
  useEffect(() => {
    if (currentMedia?.type === "video" && videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  }, [currentMedia]);

  // Controles auto-hide
  useEffect(() => {
    const showControlsTemporarily = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    const handleMouseMove = () => showControlsTemporarily();
    const handleTouch = () => showControlsTemporarily();

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchstart", handleTouch);
    showControlsTemporarily();

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchstart", handleTouch);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(console.error);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") toggleFullscreen();
      if (e.key === " ") syncWithServer();
      if (e.key === "ArrowRight") setCurrentIndex((prev) => (prev + 1) % items.length);
      if (e.key === "ArrowLeft") setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleFullscreen, syncWithServer, items.length]);

  // Tela de loading
  if (isLoading && !deviceState) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
        <h1 className="text-2xl font-semibold mb-2">Carregando Player</h1>
        <p className="text-white/60">Dispositivo: {deviceCode}</p>
      </div>
    );
  }

  // Tela de download inicial
  if (isSyncing && downloadProgress.total > 0 && downloadProgress.downloaded < downloadProgress.total) {
    const progress = (downloadProgress.downloaded / downloadProgress.total) * 100;
    
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8">
        <Download className="w-16 h-16 mb-6 text-primary animate-bounce" />
        <h1 className="text-2xl font-semibold mb-2">Baixando Conteúdos</h1>
        <p className="text-white/60 mb-6 text-center">
          {downloadProgress.current || "Preparando..."}
        </p>
        <div className="w-full max-w-md">
          <Progress value={progress} className="h-2" />
          <p className="text-center text-sm mt-2 text-white/60">
            {downloadProgress.downloaded} de {downloadProgress.total} arquivos
          </p>
        </div>
      </div>
    );
  }

  // Sem conteúdo disponível
  if (!activePlaylist || items.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <Monitor className="w-20 h-20 mb-6 text-white/30" />
        <h1 className="text-2xl font-semibold mb-2">Aguardando Conteúdo</h1>
        <p className="text-white/60 mb-4 text-center max-w-md">
          {deviceState?.device_name || deviceCode}
        </p>
        {syncError && (
          <div className="flex items-center gap-2 text-red-400 mb-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{syncError}</span>
          </div>
        )}
        <button
          onClick={syncWithServer}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-lg hover:bg-primary/30 transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
          {isSyncing ? "Sincronizando..." : "Sincronizar"}
        </button>
        <p className="text-white/40 text-sm mt-6">
          Nenhuma playlist ativa para o horário atual
        </p>
      </div>
    );
  }

  const mediaUrl = currentMedia?.blob_url || currentMedia?.file_url || "";
  const duration = currentItem?.duration_override || currentMedia?.duration || 10;
  const progressPercent = ((duration * 1000 - timeRemaining) / (duration * 1000)) * 100;

  return (
    <div className="relative min-h-screen bg-black overflow-hidden select-none">
      {/* Input EAN - SEMPRE ativo para capturar scanner, mesmo durante exibição do produto */}
      <EanInput
        isVisible={playerMode === "media"}
        onSubmit={handleEanSubmit}
        disabled={false}
        onReset={handleReset}
        alwaysListenForScanner={true}
      />

      {/* Container de Produto - sobrepõe as mídias quando ativo */}
      {playerMode === "product" && (
        <ProductLookupContainer
          product={product}
          isLoading={isProductLoading}
          error={productError}
          onDismiss={handleDismissProduct}
          timeout={15}
        />
      )}

      {/* Container de Mídias - visível apenas quando em modo mídia */}
      <div className={cn(
        "relative w-full h-screen transition-opacity duration-300",
        playerMode === "product" ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        {currentMedia?.type === "video" ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className="w-full h-full object-contain"
            autoPlay
            muted
            playsInline
            onEnded={() => setCurrentIndex((prev) => (prev + 1) % items.length)}
          />
        ) : (
          <img
            src={mediaUrl}
            alt={currentMedia?.name || "Mídia"}
            className="w-full h-full object-contain transition-opacity duration-500"
            onError={(e) => {
              // Fallback para URL original se blob falhar
              if (currentMedia?.file_url && (e.target as HTMLImageElement).src !== currentMedia.file_url) {
                (e.target as HTMLImageElement).src = currentMedia.file_url;
              }
            }}
          />
        )}
      </div>

      {/* Barra de Progresso - só visível no modo mídia */}
      {playerMode === "media" && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-primary transition-all duration-100 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Controles superiores - só visíveis no modo mídia */}
      {playerMode === "media" && (
        <div
          className={cn(
            "absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
        <div className="flex justify-between items-start">
          {/* Info do dispositivo */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-3 h-3 rounded-full",
              deviceState?.is_online ? "bg-green-500" : "bg-red-500"
            )} />
            <div>
              <p className="text-white font-medium text-sm">
                {deviceState?.device_name || deviceCode}
              </p>
              <p className="text-white/60 text-xs">
                {activePlaylist.name}
              </p>
            </div>
          </div>

          {/* Relógio e status */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white text-lg font-mono">
                {currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-white/60 text-xs">
                {currentTime.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {deviceState?.is_online ? (
                <Wifi className="w-5 h-5 text-green-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-yellow-400" />
              )}
              
              <button
                onClick={syncWithServer}
                disabled={isSyncing}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <RefreshCw className={cn("w-5 h-5 text-white", isSyncing && "animate-spin")} />
              </button>
              
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5 text-white" />
                ) : (
                  <Maximize className="w-5 h-5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Info da mídia atual */}
      {playerMode === "media" && (
      <div
        className={cn(
          "absolute bottom-6 left-6 bg-black/60 backdrop-blur-sm rounded-lg p-3 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="flex items-center gap-3">
          {currentMedia?.type === "video" ? (
            <Video className="w-5 h-5 text-primary" />
          ) : (
            <ImageIcon className="w-5 h-5 text-primary" />
          )}
          <div>
            <p className="text-white font-medium text-sm">{currentMedia?.name}</p>
            <p className="text-white/60 text-xs">
              {currentIndex + 1} de {items.length} • {Math.ceil(timeRemaining / 1000)}s restantes
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Indicadores de mídia */}
      {playerMode === "media" && (
        <div
          className={cn(
            "absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1.5 transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          {items.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-6 rounded-full transition-all duration-300",
                index === currentIndex ? "bg-primary scale-110" : "bg-white/30"
              )}
            />
          ))}
        </div>
      )}

      {/* Status de sincronização */}
      {isSyncing && playerMode === "media" && (
        <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
          <RefreshCw className="w-4 h-4 text-primary animate-spin" />
          <span className="text-white text-sm">Sincronizando...</span>
        </div>
      )}

      {/* Aviso offline */}
      {!deviceState?.is_online && playerMode === "media" && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-yellow-500/20 backdrop-blur-sm rounded-full px-4 py-1.5">
          <WifiOff className="w-4 h-4 text-yellow-400" />
          <span className="text-yellow-200 text-sm">Modo Offline</span>
        </div>
      )}

      {/* Última sincronização */}
      {deviceState?.last_sync && playerMode === "media" && (
        <div
          className={cn(
            "absolute bottom-10 left-1/2 -translate-x-1/2 text-white/40 text-xs transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0"
          )}
        >
          <Clock className="w-3 h-3 inline mr-1" />
          Última sinc.: {new Date(deviceState.last_sync).toLocaleTimeString("pt-BR")}
        </div>
      )}
    </div>
  );
};

export default OfflinePlayer;
