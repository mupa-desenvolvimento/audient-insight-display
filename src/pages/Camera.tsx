
import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera as CameraIcon, Users, Play, Square, Settings, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DetectedPerson {
  id: string;
  timestamp: Date;
  gender: 'masculino' | 'feminino' | 'indefinido';
  ageGroup: '0-12' | '13-18' | '19-25' | '26-35' | '36-50' | '51+';
  confidence: number;
  position: { x: number; y: number; width: number; height: number };
}

const Camera = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [detectedPeople, setDetectedPeople] = useState<DetectedPerson[]>([]);
  const [currentCount, setCurrentCount] = useState(0);
  const [totalToday, setTotalToday] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  // Inicializar câmera
  const startCamera = async () => {
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

  // Simulação de detecção (em produção seria substituído por IA real)
  const simulateDetection = () => {
    if (!isStreaming) return;

    const genders = ['masculino', 'feminino', 'indefinido'] as const;
    const ageGroups = ['0-12', '13-18', '19-25', '26-35', '36-50', '51+'] as const;
    
    // Simular detecção aleatória
    if (Math.random() > 0.7) {
      const newPerson: DetectedPerson = {
        id: `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        gender: genders[Math.floor(Math.random() * genders.length)],
        ageGroup: ageGroups[Math.floor(Math.random() * ageGroups.length)],
        confidence: 0.75 + Math.random() * 0.2,
        position: {
          x: Math.random() * 500,
          y: Math.random() * 400,
          width: 80 + Math.random() * 40,
          height: 100 + Math.random() * 50
        }
      };

      setDetectedPeople(prev => {
        const updated = [newPerson, ...prev].slice(0, 20); // Manter apenas os 20 mais recentes
        return updated;
      });
      
      setCurrentCount(prev => prev + 1);
      setTotalToday(prev => prev + 1);
    }
  };

  // Limpeza de pessoas antigas (simulação de saída de cena)
  useEffect(() => {
    const interval = setInterval(() => {
      setDetectedPeople(prev => 
        prev.filter(person => 
          Date.now() - person.timestamp.getTime() < 10000 // Remove após 10 segundos
        )
      );
      
      setCurrentCount(prev => Math.max(0, prev - Math.floor(Math.random() * 2)));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Simulação de detecção
  useEffect(() => {
    const interval = setInterval(simulateDetection, 2000);
    return () => clearInterval(interval);
  }, [isStreaming]);

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
          <Button variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Configurar
          </Button>
          {!isStreaming ? (
            <Button onClick={startCamera} className="gradient-primary text-white">
              <Play className="w-4 h-4 mr-2" />
              Iniciar Câmera
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
            <div className="text-2xl font-bold text-primary">{currentCount}</div>
            <p className="text-xs text-muted-foreground">
              Na tela agora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hoje</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalToday}</div>
            <p className="text-xs text-muted-foreground">
              Pessoas detectadas
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
              {isStreaming ? "Detectando pessoas" : "Câmera desligada"}
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
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ display: 'none' }}
                  />
                  
                  {/* Overlay de detecções */}
                  {isStreaming && detectedPeople.slice(0, 5).map((person) => (
                    <div
                      key={person.id}
                      className="absolute border-2 border-green-400 bg-green-400/20"
                      style={{
                        left: `${(person.position.x / 640) * 100}%`,
                        top: `${(person.position.y / 480) * 100}%`,
                        width: `${(person.position.width / 640) * 100}%`,
                        height: `${(person.position.height / 480) * 100}%`
                      }}
                    >
                      <div className="absolute -top-6 left-0 bg-green-400 text-black text-xs px-1 rounded">
                        {person.gender} | {person.ageGroup}
                      </div>
                    </div>
                  ))}
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
              <Badge variant="outline">{detectedPeople.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {detectedPeople.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma pessoa detectada</p>
                  <p className="text-sm">Inicie a câmera para começar</p>
                </div>
              ) : (
                detectedPeople.map((person) => (
                  <div key={person.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className={`${getGenderColor(person.gender)} text-white border-none`}
                          >
                            {person.gender}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className={`${getAgeGroupColor(person.ageGroup)} text-white border-none`}
                          >
                            {person.ageGroup}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Confiança: {(person.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {person.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Camera;
