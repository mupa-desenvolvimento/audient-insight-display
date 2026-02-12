import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOfflinePlayer } from "@/hooks/useOfflinePlayer";
import { AnimatePresence, motion } from "framer-motion";
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Info, X, Bell, Monitor, Maximize, Camera, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { KioskService } from "@/modules/kiosk-controller/KioskService";
import { PushHandlerService } from "@/modules/push-handler/PushHandlerService";
import { usePlayerFaceDetection } from "@/hooks/usePlayerFaceDetection";
import { CachedPlaylistItem } from "@/modules/shared/types";

import { contentScheduler } from "@/modules/content-engine";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { productService, Product } from "@/modules/product-service";
import { PriceCheckOverlay } from "@/components/PriceCheckOverlay";
import { analyticsService } from "@/modules/analytics-engine";
import { pushHandlerService } from "@/modules/push-handler";
import { kioskService } from "@/modules/kiosk-controller";
import { SystemMonitor } from "@/modules/kiosk-controller/components/SystemMonitor";

const WebViewPlayer = () => {
  const { deviceCode: paramDeviceCode } = useParams<{ deviceCode: string }>();
  const [searchParams] = useSearchParams();
  // Permite obter o código via URL param ou query param (ex: ?device_id=XYZ)
  const deviceCode = paramDeviceCode || searchParams.get("device_id") || searchParams.get("id");

  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  // Inicializar Push Handler e Kiosk Mode
  useEffect(() => {
    if (deviceCode) {
      pushHandlerService.init(deviceCode);
      kioskService.enableKioskMode();
      
      // 3. Update Notifications
      const unsubscribeNotifications = pushHandlerService.onNotification((msg) => {
        setUpdateMessage(msg);
        setShowUpdateNotification(true);
        setTimeout(() => setShowUpdateNotification(false), 5000);
      });

      return () => {
        pushHandlerService.cleanup();
        kioskService.disableKioskMode();
        unsubscribeNotifications();
      };
    }
  }, [deviceCode]);

  // Hook principal que gerencia todo o estado, sincronização e cache offline
  const {
    deviceState,
    activeItems,
    overrideMedia,
    isLoading,
    forceSync
  } = useOfflinePlayer(deviceCode || "");

  // Estado para Consulta de Preço
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [isCheckingPrice, setIsCheckingPrice] = useState(false);
  const [priceCheckError, setPriceCheckError] = useState<string | null>(null);

  // Integração com Scanner de Código de Barras
  useBarcodeScanner({
    onScan: async (barcode) => {
      console.log("Barcode Scanned:", barcode);
      setIsCheckingPrice(true);
      setPriceCheckError(null);
      setScannedProduct(null);

      try {
        const product = await productService.getProduct(barcode);
        
        // Registrar analítico
        analyticsService.logPriceCheck({
          device_id: deviceCode || "unknown",
          gtin: barcode,
          scanned_at: new Date().toISOString(),
          found: !!product,
          product_name: product?.descricao,
          price: product?.preco
        });

        if (product) {
          setScannedProduct(product);
        } else {
          setPriceCheckError("Produto não encontrado no sistema.");
        }
      } catch (err) {
        console.error("Erro ao consultar produto:", err);
        setPriceCheckError("Erro ao consultar servidor.");
      } finally {
        setIsCheckingPrice(false);
      }
    },
    minLength: 3, // Aceitar códigos menores para teste manual se necessário
    timeLimit: 100 // Scanner geralmente envia muito rápido
  });

  const handleClosePriceCheck = () => {
    setScannedProduct(null);
    setPriceCheckError(null);
    setIsCheckingPrice(false);
  };

  // Deriva playlist ativa para exibir info
  const activePlaylist = useMemo(() => 
    contentScheduler.getActivePlaylist(deviceState), 
  [deviceState]);

  // Estados de UI local
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [transitionState, setTransitionState] = useState<'visible' | 'fading'>('visible');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Determina o item atual (Override tem prioridade)
  const currentItem = overrideMedia 
    ? { 
        id: 'override', 
        media: overrideMedia, 
        duration: 15, // Default duration for override if not specified
        order: 0,
        playlist_id: 'override'
      } 
    : activeItems[currentIndex];

  const currentMedia = currentItem?.media;
  const isOnline = deviceState?.is_online ?? navigator.onLine;

  // Reset index when active items change
  useEffect(() => {
    if (currentIndex >= activeItems.length) {
      setCurrentIndex(0);
    }
  }, [activeItems.length]);

  // Memoize current content info for face detection
  const currentContentInfo = useMemo(() => {
    if (!currentMedia) return null;
    return {
      contentId: currentMedia.id,
      contentName: currentMedia.name,
      playlistId: overrideMedia ? 'override' : (activePlaylist?.id || 'unknown')
    };
  }, [currentMedia, overrideMedia, currentItem, activePlaylist]);

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

  // Inicialização Kiosk Mode (Nativo) - Delegado para o módulo, mas mantemos aqui se necessário UI específica
  // O KioskService deve ser inicializado pelo hook ou App, mas por enquanto mantemos a chamada simples se não houver conflito.
  // Vamos assumir que o KioskService cuida disso se integrado, mas aqui podemos garantir.
  
  // Controle de transição de mídia e Timer
  useEffect(() => {
    if (!currentMedia) return;

    // Use duration from override, item override, or media default
    const durationSec = overrideMedia 
      ? (overrideMedia.duration || 15)
      : (currentMedia?.duration || 10);
      
    const duration = durationSec * 1000;
    
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
      if (!overrideMedia && activeItems.length > 1) {
        setCurrentIndex(prev => (prev + 1) % activeItems.length);
      } else if (!overrideMedia && activeItems.length === 1) {
        // Se só tem 1 item, apenas reseta o timer visualmente (o loop fará o refresh)
        setTransitionState('visible'); 
      }
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fadeTimeout);
      clearTimeout(nextTimeout);
    };
  }, [currentIndex, currentMedia, activeItems.length, overrideMedia]);

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
      if (e.key === ' ') forceSync();
      if (e.key === 'ArrowRight' && activeItems.length > 0) setCurrentIndex(prev => (prev + 1) % activeItems.length);
      if (e.key === 'ArrowLeft' && activeItems.length > 0) setCurrentIndex(prev => (prev - 1 + activeItems.length) % activeItems.length);
    };
    
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [toggleFullscreen, forceSync, activeItems.length]);

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

  // Sem conteúdo ou erro
  if ((!activeItems || activeItems.length === 0) && !overrideMedia) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8">
        <Monitor className="w-16 h-16 mb-6 text-white/30" />
        <h1 className="text-xl font-semibold mb-2">Aguardando Conteúdo</h1>
        <p className="text-white/60 mb-4 text-center text-sm">
          {deviceState?.device_name || deviceCode}
        </p>
        <button
          onClick={forceSync}
          className="flex items-center gap-2 px-4 py-2 bg-primary/20 rounded-lg hover:bg-primary/30"
        >
          <RefreshCw className="w-4 h-4" />
          Sincronizar Agora
        </button>
      </div>
    );
  }

  const duration = overrideMedia?.duration || (currentItem as CachedPlaylistItem)?.duration_override || currentMedia?.duration || 10;
  const progressPercent = ((duration * 1000 - timeRemaining) / (duration * 1000)) * 100;
  
  // URL da mídia: Prefere o blob_url (local/cache), senão usa o file_url (remoto)
  const mediaUrl = currentMedia?.blob_url || currentMedia?.file_url || '';

  const getObjectFitClass = () => {
    switch (activePlaylist?.content_scale) {
      case 'contain': return 'object-contain';
      case 'fill': return 'object-fill';
      case 'cover': default: return 'object-cover';
    }
  };

  if (!currentMedia) return null;

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
            onEnded={() => {
              if (activeItems.length > 0) {
                 setCurrentIndex(prev => (prev + 1) % activeItems.length);
              }
            }}
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
                (e.target as HTMLImageElement).src = currentMedia.file_url || '';
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
              <p className="text-white/60 text-xs">{activePlaylist?.name || 'Playlist'}</p>
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
              
              <button onClick={forceSync} className="p-2 hover:bg-white/10 rounded-lg">
                <RefreshCw className="w-4 h-4 text-white" />
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
              {currentIndex + 1} de {activeItems.length} • {Math.ceil(timeRemaining / 1000)}s
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

      {/* Overlay de Consulta de Preço */}
      <PriceCheckOverlay 
        product={scannedProduct}
        isLoading={isCheckingPrice}
        error={priceCheckError}
        onClose={handleClosePriceCheck}
      />

      {/* Monitoramento de Sistema */}
      {deviceCode && <SystemMonitor deviceCode={deviceCode} />}

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