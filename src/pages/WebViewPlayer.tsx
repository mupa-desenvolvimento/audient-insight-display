import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { db } from "@/services/firebase";
import { ref, onValue } from "firebase/database";
import { usePlayerFaceDetection } from "@/hooks/usePlayerFaceDetection";
import { setupKioskMode } from "@/utils/nativeBridge";
import { Capacitor } from '@capacitor/core';
import { useOfflinePlayer } from "@/hooks/useOfflinePlayer";
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Download, 
  Monitor, 
  AlertCircle,
  Maximize,
  Clock,
  CheckCircle2,
  Bell,
  Camera,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

const WebViewPlayer = () => {
  const { deviceCode: paramDeviceCode } = useParams<{ deviceCode: string }>();
  const [searchParams] = useSearchParams();
  // Permite obter o código via URL param ou query param (ex: ?device_id=XYZ)
  const deviceCode = paramDeviceCode || searchParams.get("device_id") || searchParams.get("id");

  // Hook principal que gerencia todo o estado, sincronização e cache offline
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

  // Estados de UI local
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [transitionState, setTransitionState] = useState<'visible' | 'fading'>('visible');
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Deriva dados atuais do hook
  const items = getActiveItems();
  const activePlaylist = getActivePlaylist();
  const currentItem = items[currentIndex];
  const currentMedia = currentItem?.media;
  const isOnline = deviceState?.is_online ?? navigator.onLine;

  // Memoize current content info for face detection
  const currentContentInfo = useMemo(() => {
    if (!currentMedia || !activePlaylist) return null;
    return {
      contentId: currentMedia.id,
      contentName: currentMedia.name,
      playlistId: activePlaylist.id
    };
  }, [currentMedia, activePlaylist]);

  // Face detection - only active if device has camera enabled
  const { 
    activeFaces, 
    totalDetectionsToday,
    isModelsLoaded: faceModelsLoaded 
  } = usePlayerFaceDetection(
    deviceCode || '',
    !!deviceState?.camera_enabled,
    currentContentInfo
  );

  // Atualiza relógio
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Listener do Firebase Realtime Database
  useEffect(() => {
    if (!deviceCode) return;

    // Escuta mudanças na raiz do dispositivo
    const deviceRef = ref(db, `${deviceCode}`);
    
    const unsubscribe = onValue(deviceRef, (snapshot) => {
      const data = snapshot.val();
      
      // Verifica se houve atualização
      if (data && (data["last-update"] || data["atualizacao_plataforma"] === "true")) {
        console.log("Firebase update received:", data);
        
        setUpdateMessage("Nova atualização recebida!");
        setShowUpdateNotification(true);
        
        // Dispara sincronização com o "endpoint" (Supabase + Cache Local)
        syncWithServer();
        
        setTimeout(() => setShowUpdateNotification(false), 3000);
      }
    });

    return () => unsubscribe();
  }, [deviceCode, syncWithServer]);

  // Inicialização Kiosk Mode (Nativo)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setupKioskMode();
    }
  }, []);

  // Controle de transição de mídia e Timer
  useEffect(() => {
    if (!currentMedia || items.length === 0) return;

    const duration = (currentItem?.duration_override || currentMedia.duration || 10) * 1000;
    setTimeRemaining(duration);
    setTransitionState('visible');

    // Timer de progresso
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setTimeRemaining(Math.max(0, duration - elapsed));
    }, 100);

    // Transição suave antes de trocar
    const fadeTimeout = setTimeout(() => {
      setTransitionState('fading');
    }, duration - 500);

    // Troca de mídia
    const nextTimeout = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % items.length);
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fadeTimeout);
      clearTimeout(nextTimeout);
    };
  }, [currentIndex, currentMedia, currentItem, items.length]);

  // Auto-play vídeo
  useEffect(() => {
    if (currentMedia?.type === 'video' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
    }
  }, [currentMedia, currentIndex]); // Adicionado currentIndex para garantir replay ao voltar

  // Auto-hide controles
  useEffect(() => {
    const showControlsTemporarily = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    };

    const handleInteraction = () => showControlsTemporarily();
    
    document.addEventListener('mousemove', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    showControlsTemporarily();

    return () => {
      document.removeEventListener('mousemove', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(console.error);
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(console.error);
    }
  }, []);

  // Teclado
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === ' ') syncWithServer();
      if (e.key === 'ArrowRight') setCurrentIndex(prev => (prev + 1) % items.length);
      if (e.key === 'ArrowLeft') setCurrentIndex(prev => (prev - 1 + items.length) % items.length);
    };
    
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [toggleFullscreen, syncWithServer, items.length]);

  // Tela de loading inicial
  if (isLoading && !deviceState) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
        <h1 className="text-xl font-semibold mb-2">Carregando Player...</h1>
        <p className="text-white/60 text-sm">Dispositivo: {deviceCode}</p>
      </div>
    );
  }

  // Tela de download/sincronização inicial (apenas se não tiver dados ainda)
  if (isSyncing && !deviceState && downloadProgress.total > 0) {
     const percent = downloadProgress.total > 0 
      ? (downloadProgress.downloaded / downloadProgress.total) * 100 
      : 0;

    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8">
        <Download className="w-16 h-16 mb-6 text-primary animate-bounce" />
        <h1 className="text-xl font-semibold mb-2">Sincronizando Conteúdo</h1>
        <p className="text-white/60 mb-6 text-center text-sm">
          {downloadProgress.current || 'Preparando arquivos...'}
        </p>
        <div className="w-full max-w-sm">
          <Progress value={percent} className="h-2" />
          <p className="text-center text-xs mt-2 text-white/60">
            {downloadProgress.downloaded} de {downloadProgress.total} arquivos
          </p>
        </div>
      </div>
    );
  }

  // Sem conteúdo ou erro
  if (!activePlaylist || items.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8">
        <Monitor className="w-16 h-16 mb-6 text-white/30" />
        <h1 className="text-xl font-semibold mb-2">Aguardando Conteúdo</h1>
        <p className="text-white/60 mb-4 text-center text-sm">
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
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-lg hover:bg-primary/30"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar Novamente
        </button>
      </div>
    );
  }

  const duration = currentItem?.duration_override || currentMedia.duration || 10;
  const progressPercent = ((duration * 1000 - timeRemaining) / (duration * 1000)) * 100;
  
  // URL da mídia: Prefere o blob_url (local/cache), senão usa o file_url (remoto)
  const mediaUrl = currentMedia.blob_url || currentMedia.file_url;

  const getObjectFitClass = () => {
    switch (activePlaylist?.content_scale) {
      case 'contain': return 'object-contain';
      case 'fill': return 'object-fill';
      case 'cover': default: return 'object-cover';
    }
  };

  return (
    <div className="relative min-h-screen bg-black overflow-hidden select-none">
      {/* Notificação de atualização */}
      <div className={cn(
        "absolute top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-500",
        showUpdateNotification 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 -translate-y-4 pointer-events-none'
      )}>
        <div className="flex items-center gap-3 bg-primary/90 backdrop-blur-md text-primary-foreground px-6 py-3 rounded-full shadow-2xl">
          <Bell className="w-5 h-5 animate-pulse" />
          <span className="font-medium">{updateMessage}</span>
        </div>
      </div>

      {/* Mídia atual */}
      <div className="relative w-full h-screen">
        {currentMedia.type === 'video' ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            className={cn(
              "w-full h-full transition-opacity duration-500",
              getObjectFitClass(),
              transitionState === 'fading' ? 'opacity-0' : 'opacity-100'
            )}
            autoPlay
            muted
            playsInline
            onEnded={() => setCurrentIndex(prev => (prev + 1) % items.length)}
          />
        ) : (
          <img
            src={mediaUrl}
            alt={currentMedia.name}
            className={cn(
              "w-full h-full transition-opacity duration-500",
              getObjectFitClass(),
              transitionState === 'fading' ? 'opacity-0' : 'opacity-100'
            )}
            onError={(e) => {
              // Se falhar o blob, tenta a URL original
              if ((e.target as HTMLImageElement).src !== currentMedia.file_url) {
                (e.target as HTMLImageElement).src = currentMedia.file_url;
              }
            }}
          />
        )}
      </div>

      {/* Barra de progresso */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <div
          className="h-full bg-primary transition-all duration-100 ease-linear"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Controles superiores */}
      <div className={cn(
        "absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300",
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isOnline ? "bg-green-500" : "bg-yellow-500"
            )} />
            <div>
              <p className="text-white font-medium text-sm">{deviceState?.device_name || deviceCode}</p>
              <p className="text-white/60 text-xs">{activePlaylist.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-white text-sm font-mono">
                {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            
            <div className="flex items-center gap-1">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-yellow-400" />
              )}
              
              <button onClick={syncWithServer} disabled={isSyncing} className="p-2 hover:bg-white/10 rounded-lg disabled:opacity-50">
                <RefreshCw className={cn("w-4 h-4 text-white", isSyncing && "animate-spin")} />
              </button>
              
              <button onClick={toggleFullscreen} className="p-2 hover:bg-white/10 rounded-lg">
                <Maximize className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info da mídia */}
      <div className={cn(
        "absolute bottom-6 left-6 bg-black/60 backdrop-blur-sm rounded-lg p-3 transition-opacity duration-300",
        showControls ? 'opacity-100' : 'opacity-0'
      )}>
        <div className="flex items-center gap-2">
          {currentMedia.blob_url && (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          )}
          <div>
            <p className="text-white font-medium text-sm">{currentMedia.name}</p>
            <p className="text-white/60 text-xs">
              {currentIndex + 1} de {items.length} • {Math.ceil(timeRemaining / 1000)}s
            </p>
          </div>
        </div>
      </div>

      {/* Badge offline */}
      {!isOnline && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-yellow-500/20 rounded-full px-3 py-1">
          <WifiOff className="w-3 h-3 text-yellow-400" />
          <span className="text-yellow-200 text-xs">Offline</span>
        </div>
      )}

      {/* Indicador de detecção facial */}
      {/* (Opcional: Exibir apenas se soubermos que a câmera está ativa) */}
      <div className={cn(
        "absolute bottom-6 right-6 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg p-3 transition-opacity duration-300",
        showControls ? 'opacity-100' : 'opacity-0'
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