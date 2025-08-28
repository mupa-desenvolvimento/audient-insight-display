
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera as CameraIcon, Users, Play, Square, Settings, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { PeopleRegistration } from "@/components/PeopleRegistration";
import { DetectionHistory } from "@/components/DetectionHistory";

const Camera = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();
  
  const { 
    isModelsLoaded, 
    isLoading, 
    detectedFaces, 
    totalDetected 
  } = useFaceDetection(videoRef, canvasRef, isStreaming);

  // Inicializar câmera
  const startCamera = async () => {
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
          width: 640, 
          height: 480,
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
          description: "Sistema de reconhecimento ativo",
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
  };

  // Parar câmera
  const stopCamera = () => {
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
  };

  const getGenderColor = (gender: string) => {
    switch (gender) {
      case 'masculino': return 'bg-blue-500';
      case 'feminino': return 'bg-pink-500';
      default: return 'bg-gray-500';
    }
  };

  const getAgeGroupColor = (ageGroup: string) => {
    switch (ageGroup) {
      case '0-12': return 'bg-green-500';
      case '13-18': return 'bg-yellow-500';
      case '19-25': return 'bg-orange-500';
      case '26-35': return 'bg-red-500';
      case '36-50': return 'bg-purple-500';
      case '51+': return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Reconhecimento por Câmera</h1>
          <p className="text-muted-foreground">Sistema de detecção de pessoas em tempo real</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => window.open("/camera-fullscreen", "_blank")}
          >
            <CameraIcon className="w-4 h-4 mr-2" />
            Tela Cheia
          </Button>
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
          {!isStreaming ? (
            <Button 
              onClick={startCamera} 
              className="gradient-primary text-white"
              disabled={isLoading || !isModelsLoaded}
            >
              <Play className="w-4 h-4 mr-2" />
              {isLoading ? "Carregando IA..." : "Iniciar Câmera"}
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopCamera}>
              <Square className="w-4 h-4 mr-2" />
              Parar Câmera
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pessoas Detectadas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{detectedFaces.length}</div>
            <p className="text-xs text-muted-foreground">
              Faces detectadas agora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hoje</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalDetected}</div>
            <p className="text-xs text-muted-foreground">
              Total de detecções
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status da Câmera</CardTitle>
            <CameraIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={isStreaming ? "default" : "secondary"}>
                {isStreaming ? "Ativa" : "Inativa"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {isLoading ? "Carregando modelos IA..." : 
               isStreaming ? "Detectando faces" : "Câmera desligada"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feed da Câmera */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CameraIcon className="w-5 h-5" />
              <span>Feed da Câmera</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-black rounded-lg overflow-hidden">
              {cameraError ? (
                <div className="h-64 flex items-center justify-center text-white">
                  <div className="text-center">
                    <CameraIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{cameraError}</p>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-64 object-cover"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Pessoas Detectadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Pessoas Detectadas</span>
              <Badge variant="outline">{detectedFaces.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {detectedFaces.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma face detectada</p>
                  <p className="text-sm">{isLoading ? "Carregando modelos..." : "Inicie a câmera para começar"}</p>
                </div>
              ) : (
                detectedFaces.map((face) => (
                  <div key={face.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${face.isRegistered ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                      <div>
                        {face.isRegistered ? (
                          <div>
                            <h4 className="font-medium text-primary">{face.name}</h4>
                            <p className="text-xs text-muted-foreground">CPF: {face.cpf}</p>
                            <p className="text-xs text-muted-foreground">
                              Confiança: {(face.confidence * 100).toFixed(1)}%
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant="outline" 
                                className={`${getGenderColor(face.gender)} text-white border-none`}
                              >
                                {face.gender}
                              </Badge>
                              <Badge 
                                variant="outline"
                                className={`${getAgeGroupColor(face.ageGroup)} text-white border-none`}
                              >
                                {face.age} anos
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Pessoa não cadastrada - Confiança: {(face.confidence * 100).toFixed(1)}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {face.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Cadastro de Pessoas */}
      <PeopleRegistration videoRef={videoRef} isStreaming={isStreaming} />
      
      {/* Histórico de Detecções */}
      <DetectionHistory />
    </div>
  );
};

export default Camera;
