
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const mockMediaPlaylist = [
  {
    id: 1,
    name: "Promoção Verão 2024",
    type: "image",
    url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1080&fit=crop",
    duration: 10000
  },
  {
    id: 2,
    name: "Video Institucional",
    type: "image", // Usando imagem como exemplo
    url: "https://images.unsplash.com/photo-1560472355-536de3962603?w=1920&h=1080&fit=crop",
    duration: 8000
  },
  {
    id: 3,
    name: "Menu Especial",
    type: "image",
    url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=1080&fit=crop",
    duration: 12000
  }
];

const Player = () => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const currentMedia = mockMediaPlaylist[currentMediaIndex];

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentMediaIndex((prev) => 
        prev === mockMediaPlaylist.length - 1 ? 0 : prev + 1
      );
    }, currentMedia.duration);

    return () => clearTimeout(timer);
  }, [currentMediaIndex, currentMedia.duration]);

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
              <span>Mídia {currentMediaIndex + 1} de {mockMediaPlaylist.length}</span>
              <span>•</span>
              <span>Próxima em {Math.ceil(currentMedia.duration / 1000)}s</span>
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
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <div className="flex items-center space-x-2 text-white">
              <Monitor className="w-4 h-4" />
              <span className="text-sm">Player Digital Signage</span>
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

      {/* Indicadores de Mídia */}
      <div className={`absolute right-6 top-1/2 transform -translate-y-1/2 space-y-2 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {mockMediaPlaylist.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-8 rounded-full transition-all duration-300 ${
              index === currentMediaIndex ? 'bg-primary' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Informações de Debug (visível apenas no desenvolvimento) */}
      <div className="absolute top-20 left-6 text-white/60 text-xs space-y-1">
        <div>Dispositivo: TV-001</div>
        <div>Playlist: Promoções Verão</div>
        <div>Status: Online</div>
        <div>Público Detectado: 23 pessoas</div>
      </div>
    </div>
  );
};

export default Player;
