import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Monitor, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useDevicePlayerData } from "@/hooks/useDevicePlayerData";

const DevicePlayer = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const { data, isLoading, error } = useDevicePlayerData(deviceId);

  // Determine what to play: override media or playlist items
  const mediaItems = data?.overrideMedia 
    ? [data.overrideMedia] 
    : (data?.mediaItems || []);
  
  const currentMedia = mediaItems[currentMediaIndex];

  // Media rotation effect
  useEffect(() => {
    if (mediaItems.length === 0 || !currentMedia) return;

    // For videos, rely on onEnded event
    if (currentMedia.type === 'video') return;

    const duration = (currentMedia.duration || 10) * 1000;
    const timer = setTimeout(() => {
      setCurrentMediaIndex((prev) => 
        prev === mediaItems.length - 1 ? 0 : prev + 1
      );
    }, duration);

    return () => clearTimeout(timer);
  }, [currentMediaIndex, currentMedia, mediaItems.length]);

  // Reset index when media items change
  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [data?.playlist?.id, data?.overrideMedia?.id]);

  // Hide controls after inactivity
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const hideControls = () => {
      timer = setTimeout(() => setShowControls(false), 3000);
    };

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timer);
      hideControls();
    };

    hideControls();
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timer);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin opacity-50" />
          <p className="text-white/70">Carregando player...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl mb-2">Erro ao carregar</h1>
          <p className="text-white/70 mb-4">{(error as Error).message}</p>
          <Link to="/devices">
            <Button variant="outline">Voltar</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Device not found
  if (!data?.device) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h1 className="text-2xl mb-2">Dispositivo não encontrado</h1>
          <p className="text-white/70 mb-4">Código: {deviceId}</p>
          <Link to="/devices">
            <Button variant="outline">Voltar aos Dispositivos</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Device is blocked
  if (data.device.is_blocked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl mb-2">Dispositivo Bloqueado</h1>
          <p className="text-white/70">{data.device.blocked_message || 'Este dispositivo foi bloqueado pelo administrador.'}</p>
        </div>
      </div>
    );
  }

  // No playlist or media
  if (mediaItems.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h1 className="text-2xl mb-2">Nenhuma mídia configurada</h1>
          <p className="text-white/70 mb-4">
            {data.playlist ? `Playlist: ${data.playlist.name}` : 'Nenhuma playlist atribuída'}
          </p>
          <Link to="/devices">
            <Button variant="outline">Configurar Playlist</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Main Content - Full Screen */}
      <div className="absolute inset-0">
        {currentMedia.type === 'video' ? (
          <video
            key={currentMedia.id}
            src={currentMedia.file_url || ''}
            className="w-full h-full object-fill"
            autoPlay
            muted
            playsInline
            onEnded={() => {
              setCurrentMediaIndex((prev) => 
                prev === mediaItems.length - 1 ? 0 : prev + 1
              );
            }}
          />
        ) : (
          <img
            src={currentMedia.file_url || ''}
            alt={currentMedia.name}
            className="w-full h-full object-fill"
          />
        )}
      </div>

      {/* Controls (appear on mouse move) */}
      <div className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/devices">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center space-x-2 text-white text-sm">
              <Monitor className="w-4 h-4" />
              <span>{data.device.name}</span>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/20"
          >
            {isFullscreen ? 'Sair' : 'Tela Cheia'}
          </Button>
        </div>
      </div>

      {/* Media Indicators */}
      <div className={`absolute right-4 top-1/2 transform -translate-y-1/2 space-y-2 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {mediaItems.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-6 rounded-full transition-all duration-300 ${
              index === currentMediaIndex ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default DevicePlayer;
