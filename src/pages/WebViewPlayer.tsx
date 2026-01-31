import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useMediaPreloader } from "@/hooks/useMediaPreloader";
import { usePlayerFaceDetection } from "@/hooks/usePlayerFaceDetection";
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

interface MediaItem {
  id: string;
  name: string;
  type: string;
  file_url: string;
  duration: number;
}

interface PlaylistItem {
  id: string;
  media_id: string;
  position: number;
  duration_override: number | null;
  media: MediaItem;
}

interface PlaylistChannel {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  is_fallback: boolean;
  is_active: boolean;
  items: PlaylistItem[];
}

interface Playlist {
  id: string;
  name: string;
  is_active: boolean;
  priority: number;
  content_scale: 'cover' | 'contain' | 'fill';
  has_channels: boolean;
  channels: PlaylistChannel[];
  items: PlaylistItem[]; // Legacy items for backward compatibility
}

interface DeviceInfo {
  id: string;
  name: string;
  store_id: string | null;
  current_playlist_id: string | null;
  camera_enabled: boolean;
}

const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutos
const PRELOAD_AHEAD = 3; // Pré-carrega 3 mídias à frente

/**
 * Player otimizado para WebView (Kodular/Android)
 * - Pré-download completo de todas as mídias antes de iniciar
 * - Transições instantâneas sem delay
 * - Funciona 100% offline após sincronização inicial
 */
const WebViewPlayer = () => {
  const { deviceCode } = useParams<{ deviceCode: string }>();
  const {
    preloadAll,
    preloadNext,
    getPreloadedUrl,
    isPreloaded,
    progress: preloadProgress,
  } = useMediaPreloader();

  // Estados
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreloading, setIsPreloading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [transitionState, setTransitionState] = useState<'visible' | 'fading'>('visible');
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get active channel based on current time
  const getActiveChannel = useCallback((playlist: Playlist): PlaylistChannel | null => {
    if (!playlist.has_channels || playlist.channels.length === 0) {
      return null;
    }
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);
    
    // Find channel matching current time and day
    const activeChannel = playlist.channels.find(channel => {
      if (!channel.is_active) return false;
      if (!channel.days_of_week.includes(currentDay)) return false;
      
      const startTime = channel.start_time.slice(0, 5);
      const endTime = channel.end_time.slice(0, 5);
      
      // Handle overnight schedules
      if (startTime > endTime) {
        return currentTime >= startTime || currentTime <= endTime;
      }
      
      return currentTime >= startTime && currentTime <= endTime;
    });
    
    // Return fallback if no channel matches
    if (!activeChannel) {
      return playlist.channels.find(c => c.is_fallback && c.is_active) || null;
    }
    
    return activeChannel;
  }, []);

  // Obtém playlist ativa
  const getActivePlaylist = useCallback((): Playlist | null => {
    if (playlists.length === 0) return null;
    
    // Filter and sort by priority
    const active = playlists
      .filter(p => p.is_active && (p.items.length > 0 || p.channels.some(c => c.items.length > 0)))
      .sort((a, b) => b.priority - a.priority);
    
    return active[0] || null;
  }, [playlists]);

  const activePlaylist = getActivePlaylist();
  const activeChannel = activePlaylist ? getActiveChannel(activePlaylist) : null;
  
  // Get items from active channel or legacy playlist items
  const items = activeChannel?.items || activePlaylist?.items || [];
  const currentItem = items[currentIndex];
  const currentMedia = currentItem?.media;


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
    !!(device?.camera_enabled && isReady),
    currentContentInfo
  );

  // Atualiza relógio
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Monitora conexão
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Carrega dados do servidor
  const syncWithServer = useCallback(async () => {
    if (!deviceCode) return;
    
    setSyncError(null);
    
    try {
      // Busca dispositivo
      const { data: deviceData, error: deviceError } = await supabase
        .from('devices')
        .select('id, name, store_id, current_playlist_id, camera_enabled')
        .eq('device_code', deviceCode)
        .single();

      if (deviceError) throw new Error('Dispositivo não encontrado');
      setDevice(deviceData);

      // Busca playlists
      const { data: playlistsData, error: playlistsError } = await supabase
        .from('playlists')
        .select(`
          id,
          name,
          is_active,
          priority,
          content_scale,
          playlist_items(
            id,
            media_id,
            position,
            duration_override,
            media:media_items(id, name, type, file_url, duration)
          )
        `)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (playlistsError) throw playlistsError;

      // Formata playlists
      const formattedPlaylists: Playlist[] = (playlistsData || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        is_active: p.is_active,
        priority: p.priority || 0,
        content_scale: (p.content_scale as 'cover' | 'contain' | 'fill') || 'cover',
        has_channels: p.has_channels || false,
        channels: [], // Will be fetched separately if needed
        items: (p.playlist_items || [])
          .filter((item: any) => item.media?.file_url)
          .map((item: any) => ({
            id: item.id,
            media_id: item.media_id,
            position: item.position,
            duration_override: item.duration_override,
            media: {
              id: item.media.id,
              name: item.media.name,
              type: item.media.type,
              file_url: convertToPublicUrl(item.media.file_url),
              duration: item.media.duration || 10,
            },
          }))
          .sort((a: PlaylistItem, b: PlaylistItem) => a.position - b.position),
      }));

      setPlaylists(formattedPlaylists);
      setLastSync(new Date());

      // Atualiza last_seen
      await supabase
        .from('devices')
        .update({ last_seen_at: new Date().toISOString(), status: 'online' })
        .eq('id', deviceData.id);

    } catch (e) {
      console.error('Erro ao sincronizar:', e);
      setSyncError(e instanceof Error ? e.message : 'Erro desconhecido');
    }
  }, [deviceCode]);

  // Converte URL para formato público
  const convertToPublicUrl = (url: string | null): string => {
    if (!url) return '';
    if (url.includes('.r2.dev/')) return url;
    
    const match = url.match(/https:\/\/[^/]+\.r2\.cloudflarestorage\.com\/[^/]+\/(.+)/);
    if (match) {
      return `https://pub-0e15cc358ba84ff2a24226b12278433b.r2.dev/${match[1]}`;
    }
    return url;
  };

  // Pré-carrega todas as mídias
  const preloadAllMedia = useCallback(async () => {
    if (items.length === 0) return;
    
    setIsPreloading(true);
    
    const mediaItems = items.map(item => ({
      id: item.media.id,
      url: item.media.file_url,
      type: item.media.type,
      name: item.media.name,
    }));
    
    await preloadAll(mediaItems);
    
    setIsPreloading(false);
    setIsReady(true);
  }, [items, preloadAll]);

  // Inicialização
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await syncWithServer();
      setIsLoading(false);
    };
    
    init();
  }, [syncWithServer]);

  // Pré-carrega quando playlists mudam
  useEffect(() => {
    if (playlists.length > 0 && !isReady) {
      preloadAllMedia();
    }
  }, [playlists, isReady, preloadAllMedia]);

  // Sincronização periódica
  useEffect(() => {
    syncIntervalRef.current = setInterval(() => {
      if (isOnline) syncWithServer();
    }, SYNC_INTERVAL);
    
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, [syncWithServer, isOnline]);

  // Realtime subscription para atualizações de playlists
  useEffect(() => {
    if (!device?.current_playlist_id) return;

    const channel = supabase
      .channel(`playlist-updates-${device.current_playlist_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'playlists',
          filter: `id=eq.${device.current_playlist_id}`,
        },
        (payload) => {
          console.log('Playlist updated:', payload);
          setUpdateMessage('Playlist atualizada! Sincronizando...');
          setShowUpdateNotification(true);
          
          // Clear previous timeout
          if (notificationTimeoutRef.current) {
            clearTimeout(notificationTimeoutRef.current);
          }
          
          // Resync after receiving update
          syncWithServer().then(() => {
            setIsReady(false); // Force re-preload
            setUpdateMessage('Conteúdo atualizado com sucesso!');
            
            notificationTimeoutRef.current = setTimeout(() => {
              setShowUpdateNotification(false);
            }, 4000);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [device?.current_playlist_id, syncWithServer]);

  // Controle de transição de mídia
  useEffect(() => {
    if (!isReady || !currentMedia || items.length === 0) return;

    const duration = (currentItem?.duration_override || currentMedia.duration || 10) * 1000;
    setTimeRemaining(duration);
    setTransitionState('visible');

    // Pré-carrega próximas mídias
    const mediaItems = items.map(item => ({
      id: item.media.id,
      url: item.media.file_url,
      type: item.media.type,
      name: item.media.name,
    }));
    preloadNext(mediaItems, currentIndex, PRELOAD_AHEAD);

    // Timer de progresso
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setTimeRemaining(Math.max(0, duration - elapsed));
    }, 100);

    // Transição suave antes de trocar
    const fadeTimeout = setTimeout(() => {
      setTransitionState('fading');
    }, duration - 500); // Inicia fade 500ms antes

    // Troca de mídia
    const nextTimeout = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % items.length);
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(fadeTimeout);
      clearTimeout(nextTimeout);
    };
  }, [currentIndex, currentMedia, currentItem, items.length, isReady, preloadNext, items]);

  // Auto-play vídeo
  useEffect(() => {
    if (currentMedia?.type === 'video' && videoRef.current && isReady) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
    }
  }, [currentMedia, isReady]);

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
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-6" />
        <h1 className="text-xl font-semibold mb-2">Conectando...</h1>
        <p className="text-white/60 text-sm">Dispositivo: {deviceCode}</p>
      </div>
    );
  }

  // Tela de pré-download
  if (isPreloading && !isReady) {
    const percent = preloadProgress.total > 0 
      ? (preloadProgress.loaded / preloadProgress.total) * 100 
      : 0;

    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8">
        <Download className="w-16 h-16 mb-6 text-primary animate-bounce" />
        <h1 className="text-xl font-semibold mb-2">Baixando Conteúdos</h1>
        <p className="text-white/60 mb-6 text-center text-sm">
          {preloadProgress.current || 'Preparando...'}
        </p>
        <div className="w-full max-w-sm">
          <Progress value={percent} className="h-2" />
          <p className="text-center text-xs mt-2 text-white/60">
            {preloadProgress.loaded} de {preloadProgress.total} arquivos
          </p>
        </div>
      </div>
    );
  }

  // Sem conteúdo
  if (!activePlaylist || items.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-8">
        <Monitor className="w-16 h-16 mb-6 text-white/30" />
        <h1 className="text-xl font-semibold mb-2">Aguardando Conteúdo</h1>
        <p className="text-white/60 mb-4 text-center text-sm">
          {device?.name || deviceCode}
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
          Sincronizar
        </button>
      </div>
    );
  }

  // Player principal
  const mediaUrl = getPreloadedUrl(currentMedia.id, currentMedia.file_url);
  const duration = currentItem?.duration_override || currentMedia.duration || 10;
  const progressPercent = ((duration * 1000 - timeRemaining) / (duration * 1000)) * 100;
  
  // Determina a classe de object-fit com base na configuração
  const getObjectFitClass = () => {
    switch (activePlaylist?.content_scale) {
      case 'contain':
        return 'object-contain';
      case 'fill':
        return 'object-fill';
      case 'cover':
      default:
        return 'object-cover';
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
              // Fallback para URL original
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
              <p className="text-white font-medium text-sm">{device?.name || deviceCode}</p>
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
              
              <button onClick={syncWithServer} className="p-2 hover:bg-white/10 rounded-lg">
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
          {isPreloaded(currentMedia.id) && (
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

      {/* Indicadores */}
      <div className={cn(
        "absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 transition-opacity duration-300",
        showControls ? 'opacity-100' : 'opacity-0'
      )}>
        {items.map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-4 rounded-full transition-all",
              i === currentIndex ? 'bg-primary scale-110' : 'bg-white/30'
            )}
          />
        ))}
      </div>

      {/* Badge offline */}
      {!isOnline && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-yellow-500/20 rounded-full px-3 py-1">
          <WifiOff className="w-3 h-3 text-yellow-400" />
          <span className="text-yellow-200 text-xs">Offline</span>
        </div>
      )}

      {/* Indicador de detecção facial */}
      {device?.camera_enabled && (
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
          {totalDetectionsToday > 0 && (
            <span className="text-white/60 text-xs border-l border-white/20 pl-2">
              {totalDetectionsToday} hoje
            </span>
          )}
        </div>
      )}

      {/* Última sincronização */}
      {lastSync && (
        <div className={cn(
          "absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 text-xs transition-opacity",
          showControls ? 'opacity-100' : 'opacity-0'
        )}>
          <Clock className="w-3 h-3 inline mr-1" />
          Sinc.: {lastSync.toLocaleTimeString('pt-BR')}
        </div>
      )}
    </div>
  );
};

export default WebViewPlayer;
