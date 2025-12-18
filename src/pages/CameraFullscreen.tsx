import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Camera as CameraIcon, Play, Square, Users, UserCheck, UserX, Settings, ArrowLeft, Maximize, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { usePeopleRegistry } from "@/hooks/usePeopleRegistry";
import { useNavigate } from "react-router-dom";

const CameraFullscreen = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { registeredPeople } = usePeopleRegistry();
  
  const { 
    isModelsLoaded, 
    isLoading, 
    activeFaces,
    totalLooking,
    totalSessionsToday
  } = useFaceDetection(videoRef, canvasRef, isStreaming);

  // Entrar em modo fullscreen com suporte amplo
  const enterFullscreen = async () => {
    try {
      const elem = document.documentElement;
      
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        await (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).mozRequestFullScreen) {
        await (elem as any).mozRequestFullScreen();
      } else if ((elem as any).msRequestFullscreen) {
        await (elem as any).msRequestFullscreen();
      }
      
      setIsFullscreen(true);
      toast({
        title: "Modo tela cheia",
        description: "Pressione ESC para sair",
      });
    } catch (error) {
      console.error("Erro ao entrar em fullscreen:", error);
      toast({
        title: "Erro",
        description: "Não foi possível entrar em tela cheia",
        variant: "destructive",
      });
    }
  };

  // Monitorar mudanças no estado fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFullscreenNow = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFullscreenNow);
    };

    // Adicionar todos os listeners de fullscreen
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    // Tentar entrar em fullscreen após um pequeno delay
    const timer = setTimeout(() => {
      enterFullscreen();
    }, 100);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);


  // Inicializar câmera
  const startCamera = useCallback(async () => {
    if (!isModelsLoaded) {
      toast({
        title: "Modelos carregando",
        description: "Aguarde o carregamento dos modelos de IA",
        variant: "destructive",
      });
      return;
    }

    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 },
          facingMode: 'user' 
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        
        toast({
          title: "Câmera iniciada",
          description: "Sistema de reconhecimento ativo em tela cheia",
        });
      }
    } catch (error) {
      setCameraError("Erro ao acessar a câmera. Verifique as permissões.");
      console.error("Erro ao acessar câmera:", error);
      
      toast({
        title: "Erro na câmera",
        description: "Não foi possível acessar a câmera",
        variant: "destructive",
      });
    }
  }, [isModelsLoaded, toast]);

  // Parar câmera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    
    toast({
      title: "Câmera parada",
      description: "Sistema de reconhecimento desativado",
    });
  }, [toast]);

  // Iniciar câmera automaticamente quando os modelos estiverem carregados
  useEffect(() => {
    if (isModelsLoaded && !isStreaming && !cameraError) {
      startCamera();
    }
  }, [isModelsLoaded, isStreaming, cameraError, startCamera]);

  const registeredFaces = activeFaces.filter(face => face.isRegistered);
  const unregisteredFaces = activeFaces.filter(face => !face.isRegistered);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden" style={{
      width: '100vw',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999
    }}>
      {/* Controles no canto superior esquerdo */}
      <div className="absolute top-4 left-4 z-50 flex space-x-2">
        <Button
          variant="secondary"
          onClick={() => navigate(-1)}
          className="bg-black/50 text-white border-white/20 hover:bg-black/70"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        
        <Button
          variant="secondary"
          className="bg-black/50 text-white border-white/20 hover:bg-black/70"
        >
          <Settings className="w-4 h-4 mr-2" />
          Config
        </Button>
      </div>

      {/* Controle de câmera no canto superior direito */}
      <div className="absolute top-4 right-4 z-50">
        {!isStreaming ? (
          <Button 
            onClick={startCamera} 
            disabled={isLoading || !isModelsLoaded}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Play className="w-4 h-4 mr-2" />
            {isLoading ? "Carregando IA..." : "Iniciar Câmera"}
          </Button>
        ) : (
          <Button 
            variant="destructive" 
            onClick={stopCamera}
            className="bg-red-600 hover:bg-red-700"
          >
            <Square className="w-4 h-4 mr-2" />
            Parar Câmera
          </Button>
        )}
      </div>

      {/* Feed da câmera em tela cheia */}
      <div className="relative w-full h-full">
        {cameraError ? (
          <div className="flex items-center justify-center w-full h-full text-white">
            <div className="text-center">
              <CameraIcon className="w-24 h-24 mx-auto mb-8 opacity-50" />
              <h2 className="text-2xl font-bold mb-4">Erro na Câmera</h2>
              <p className="text-lg">{cameraError}</p>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
          </>
        )}
      </div>

      {/* Painel de informações no canto inferior direito */}
      {isStreaming && (
        <div className="absolute bottom-4 right-4 z-50 space-y-3 w-80 animate-fade-in">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2">
            <Card className="bg-black/60 border-white/20">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-green-400">{registeredPeople.length}</div>
                <div className="text-xs text-white/80">Cadastradas</div>
              </CardContent>
            </Card>
            
            <Card className="bg-black/60 border-white/20">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-green-400">{registeredFaces.length}</div>
                <div className="text-xs text-white/80">Reconhecidas</div>
              </CardContent>
            </Card>
            
            <Card className="bg-black/60 border-white/20">
              <CardContent className="p-3 text-center">
                <div className="text-lg font-bold text-orange-400">{unregisteredFaces.length}</div>
                <div className="text-xs text-white/80">Não cadastradas</div>
              </CardContent>
            </Card>
          </div>

          {/* Faces reconhecidas */}
          {registeredFaces.length > 0 && (
            <Card className="bg-black/60 border-green-500/30">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <UserCheck className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">Reconhecidas</span>
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                    {registeredFaces.length}
                  </Badge>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {registeredFaces.slice(0, 3).map((face, index) => (
                    <div key={`reg-${face.trackId}-${index}`} className="text-xs text-white/90">
                      <div className="font-medium text-green-300">{face.name}</div>
                      <div className="text-white/60">
                        {face.cpf} • {(face.confidence * 100).toFixed(1)}%
                      </div>
                      <div className="flex items-center space-x-1 text-yellow-400 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>Olhando há {face.lookingDuration?.toFixed(1) || '0.0'}s</span>
                      </div>
                    </div>
                  ))}
                  {registeredFaces.length > 3 && (
                    <div className="text-xs text-white/60">
                      +{registeredFaces.length - 3} mais...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Faces não cadastradas */}
          {unregisteredFaces.length > 0 && (
            <Card className="bg-black/60 border-orange-500/30">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <UserX className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-medium text-orange-400">Não Cadastradas</span>
                  <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                    {unregisteredFaces.length}
                  </Badge>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {unregisteredFaces.slice(0, 3).map((face, index) => (
                    <div key={`unreg-${face.trackId}-${index}`} className="text-xs text-white/90">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                          {face.gender}
                        </Badge>
                        <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                          {face.age} anos
                        </Badge>
                      </div>
                      <div className="text-white/60 mt-1">
                        Confiança: {(face.confidence * 100).toFixed(1)}%
                      </div>
                      <div className="flex items-center space-x-1 text-yellow-400 mt-1">
                        <Clock className="w-3 h-3" />
                        <span>Olhando há {face.lookingDuration?.toFixed(1) || '0.0'}s</span>
                      </div>
                    </div>
                  ))}
                  {unregisteredFaces.length > 3 && (
                    <div className="text-xs text-white/60">
                      +{unregisteredFaces.length - 3} mais...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status geral */}
          <Card className="bg-black/60 border-white/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-xs text-white/80">
                <span>Sessões hoje:</span>
                <span className="font-bold text-white">{totalSessionsToday}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-white/80 mt-1">
                <span>Status IA:</span>
                <Badge variant={isModelsLoaded ? "default" : "secondary"} className="text-xs">
                  {isLoading ? "Carregando..." : isModelsLoaded ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instruções quando não está streaming */}
      {!isStreaming && !cameraError && (
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <div className="text-center">
            <CameraIcon className="w-24 h-24 mx-auto mb-8 opacity-50" />
            <h2 className="text-3xl font-bold mb-4">Câmera em Tela Cheia</h2>
            <p className="text-lg text-white/80 mb-8">
              Clique em "Iniciar Câmera" para começar o reconhecimento facial
            </p>
            {isLoading && (
              <div className="text-lg text-yellow-400">
                Carregando modelos de IA...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraFullscreen;