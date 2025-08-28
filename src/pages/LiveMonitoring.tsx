import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera as CameraIcon, Users, Play, Square, UserCheck, UserX, Clock, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { usePeopleRegistry } from "@/hooks/usePeopleRegistry";
import { useDetectionLog } from "@/hooks/useDetectionLog";

const LiveMonitoring = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();
  const { registeredPeople } = usePeopleRegistry();
  const { detectionLogs, getStats } = useDetectionLog();
  
  const { 
    isModelsLoaded, 
    isLoading, 
    detectedFaces, 
    totalDetected 
  } = useFaceDetection(videoRef, canvasRef, isStreaming);

  const sessionStats = getStats();

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
          title: "Monitoramento iniciado",
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
      title: "Monitoramento parado",
      description: "Sistema de reconhecimento desativado",
    });
  };

  const registeredFaces = detectedFaces.filter(face => face.isRegistered);
  const unregisteredFaces = detectedFaces.filter(face => !face.isRegistered);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Monitoramento em Tempo Real</h1>
          <p className="text-muted-foreground">Visualização de faces cadastradas e não cadastradas</p>
        </div>
        <div className="flex space-x-2">
          {!isStreaming ? (
            <Button 
              onClick={startCamera} 
              className="gradient-primary text-white"
              disabled={isLoading || !isModelsLoaded}
            >
              <Play className="w-4 h-4 mr-2" />
              {isLoading ? "Carregando IA..." : "Iniciar Monitoramento"}
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopCamera}>
              <Square className="w-4 h-4 mr-2" />
              Parar Monitoramento
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pessoas Cadastradas</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{registeredPeople.length}</div>
            <p className="text-xs text-muted-foreground">
              Total no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faces Reconhecidas</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{registeredFaces.length}</div>
            <p className="text-xs text-muted-foreground">
              Detectadas agora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faces Não Cadastradas</CardTitle>
            <UserX className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unregisteredFaces.length}</div>
            <p className="text-xs text-muted-foreground">
              Detectadas agora
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Detecções Hoje</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{sessionStats.todayDetections}</div>
            <p className="text-xs text-muted-foreground">
              Pessoas únicas: {sessionStats.uniquePeopleToday}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Feed da Câmera */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CameraIcon className="w-5 h-5" />
              <span>Feed da Câmera</span>
              <Badge variant={isStreaming ? "default" : "secondary"}>
                {isStreaming ? "Ativo" : "Inativo"}
              </Badge>
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

        {/* Faces Cadastradas Detectadas */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-green-500" />
              <span>Faces Cadastradas</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {registeredFaces.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {registeredFaces.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma face cadastrada detectada</p>
                </div>
              ) : (
                registeredFaces.map((face) => (
                  <div key={face.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div>
                        <h4 className="font-medium text-green-800 dark:text-green-200">{face.name}</h4>
                        <p className="text-xs text-green-600 dark:text-green-400">CPF: {face.cpf}</p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Confiança: {(face.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-green-600 dark:text-green-400">
                        {face.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Faces Não Cadastradas */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserX className="w-5 h-5 text-orange-500" />
              <span>Faces Não Cadastradas</span>
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                {unregisteredFaces.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {unregisteredFaces.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <UserX className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma face não cadastrada detectada</p>
                </div>
              ) : (
                unregisteredFaces.map((face) => (
                  <div key={face.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className="bg-blue-100 text-blue-800 border-blue-200"
                          >
                            {face.gender}
                          </Badge>
                          <Badge 
                            variant="outline"
                            className="bg-purple-100 text-purple-800 border-purple-200"
                          >
                            {face.age} anos
                          </Badge>
                        </div>
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          Confiança: {(face.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-orange-600 dark:text-orange-400">
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

      {/* Últimas Detecções */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-5 h-5" />
              <span>Últimas Detecções</span>
            </div>
            <Badge variant="outline">{detectionLogs.slice(0, 10).length} registros</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {detectionLogs.slice(0, 10).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma detecção registrada</p>
              </div>
            ) : (
              detectionLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div>
                      <h4 className="font-medium">{log.personName}</h4>
                      <p className="text-xs text-muted-foreground">CPF: {log.personCpf}</p>
                      <p className="text-xs text-muted-foreground">
                        Confiança: {(log.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {log.detectedAt.toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.detectedAt.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveMonitoring;