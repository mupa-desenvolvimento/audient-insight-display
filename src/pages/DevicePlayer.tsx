
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Monitor, ArrowLeft, Camera, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";

// Dados mockados das mídias por dispositivo
const devicePlaylists = {
  "tv-001-sp-shopping": [
    {
      id: 1,
      name: "Promoção Verão 2024",
      type: "image",
      url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop",
      duration: 10000
    },
    {
      id: 2,
      name: "Menu Especial",
      type: "image",
      url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=1080&fit=crop",
      duration: 8000
    }
  ],
  "totem-002-rj-airport": [
    {
      id: 3,
      name: "Bem-vindos ao Aeroporto",
      type: "image",
      url: "https://images.unsplash.com/photo-1560472355-536de3962603?w=1920&h=1080&fit=crop",
      duration: 12000
    }
  ],
  "display-003-bsb-mall": [
    {
      id: 4,
      name: "Menu Digital",
      type: "image",
      url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1920&h=1080&fit=crop",
      duration: 15000
    }
  ],
  "monitor-004-sp-office": [
    {
      id: 5,
      name: "Institucional Corporativo",
      type: "image",
      url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=1080&fit=crop",
      duration: 20000
    }
  ]
};

const DevicePlayer = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [audienceData, setAudienceData] = useState({
    currentCount: 0,
    totalToday: 0,
    demographics: {
      male: 0,
      female: 0,
      ageGroups: {
        "0-18": 0,
        "19-35": 0,
        "36-50": 0,
        "51+": 0
      }
    }
  });

  const playlist = deviceId ? devicePlaylists[deviceId as keyof typeof devicePlaylists] || [] : [];
  const currentMedia = playlist[currentMediaIndex];

  // Simulação de dados da câmera (em produção seria via WebSocket ou API)
  useEffect(() => {
    const interval = setInterval(() => {
      setAudienceData(prev => ({
        ...prev,
        currentCount: Math.floor(Math.random() * 10),
        totalToday: prev.totalToday + Math.floor(Math.random() * 3)
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (playlist.length === 0) return;

    const timer = setTimeout(() => {
      setCurrentMediaIndex((prev) => 
        prev === playlist.length - 1 ? 0 : prev + 1
      );
    }, currentMedia?.duration || 10000);

    return () => clearTimeout(timer);
  }, [currentMediaIndex, currentMedia?.duration, playlist.length]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timer);
      setTimeout(() => setShowControls(false), 3000);
    };

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

  // Função para enviar dados da audiência para o servidor
  const sendAudienceData = (data: any) => {
    // Em produção, fazer POST para API
    console.log('Enviando dados de audiência:', data);
    fetch('/api/audience-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId,
        timestamp: new Date().toISOString(),
        ...data
      })
    }).catch(console.error);
  };

  if (!deviceId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <h1 className="text-2xl mb-4">Dispositivo não encontrado</h1>
          <Link to="/admin/devices">
            <Button variant="outline">Voltar aos Dispositivos</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (playlist.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h1 className="text-2xl mb-2">Nenhuma mídia configurada</h1>
          <p className="text-white/70 mb-4">Dispositivo: {deviceId}</p>
          <Link to="/admin/devices">
            <Button variant="outline">Configurar Playlist</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Conteúdo Principal */}
      <div className="relative w-full h-screen">
        <img
          src={currentMedia.url}
          alt={currentMedia.name}
          className="w-full h-full object-cover transition-opacity duration-1000"
        />
        
        {/* Overlay de Informações */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8">
          <div className="max-w-4xl">
            <h1 className="text-4xl font-bold text-white mb-2">
              {currentMedia.name}
            </h1>
            <div className="flex items-center space-x-4 text-white/80">
              <span>Mídia {currentMediaIndex + 1} de {playlist.length}</span>
              <span>•</span>
              <span>Dispositivo: {deviceId}</span>
            </div>
          </div>
        </div>

        {/* Barra de Progresso */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div 
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ 
              width: `${((Date.now() % currentMedia.duration) / currentMedia.duration) * 100}%` 
            }}
          ></div>
        </div>
      </div>

      {/* Controles (aparecem ao mover o mouse) */}
      <div className={`absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/admin/devices">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center space-x-2 text-white">
              <Monitor className="w-4 h-4" />
              <span className="text-sm">Player - {deviceId}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}
            </Button>
          </div>
        </div>
      </div>

      {/* Dados da Audiência (Reconhecimento IA) */}
      <div className={`absolute top-20 left-6 bg-black/50 backdrop-blur-sm rounded-lg p-4 text-white text-sm space-y-2 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-30'}`}>
        <div className="flex items-center space-x-2 text-blue-400 font-semibold">
          <Camera className="w-4 h-4" />
          <span>Reconhecimento IA</span>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-3 h-3" />
          <span>Pessoas detectadas: {audienceData.currentCount}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-3 h-3" />
          <span>Total hoje: {audienceData.totalToday}</span>
        </div>
        <div className="text-xs text-white/70">
          Status: Ativo • Último envio: agora
        </div>
      </div>

      {/* Indicadores de Mídia */}
      <div className={`absolute right-6 top-1/2 transform -translate-y-1/2 space-y-2 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {playlist.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-8 rounded-full transition-all duration-300 ${
              index === currentMediaIndex ? 'bg-primary' : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default DevicePlayer;
