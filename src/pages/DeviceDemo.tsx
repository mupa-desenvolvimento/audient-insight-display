import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Camera as CameraIcon, 
  Users, 
  Play, 
  Square, 
  Eye, 
  Clock, 
  Smile, 
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFaceDetection, EmotionType, ActiveFace } from "@/hooks/useFaceDetection";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface DetectionRecord {
  id: string;
  timestamp: Date;
  gender: string;
  age: number;
  ageGroup: string;
  emotion: EmotionType;
  emotionConfidence: number;
  attentionDuration: number;
  isRegistered: boolean;
}

interface EmotionStats {
  emotion: EmotionType;
  count: number;
  percentage: number;
}

interface GenderStats {
  gender: string;
  count: number;
  percentage: number;
}

interface AgeStats {
  ageGroup: string;
  count: number;
  percentage: number;
}

const DeviceDemo = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [detectionHistory, setDetectionHistory] = useState<DetectionRecord[]>([]);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previousFacesRef = useRef<Set<string>>(new Set());

  const { toast } = useToast();

  const { isModelsLoaded, isLoading, activeFaces, totalLooking, totalSessionsToday } = useFaceDetection(
    videoRef,
    canvasRef,
    isStreaming,
  );

  // Track when faces leave the frame to record them
  useEffect(() => {
    const currentFaceIds = new Set(activeFaces.map(f => f.trackId));
    const previousFaceIds = previousFacesRef.current;

    // Find faces that left
    previousFaceIds.forEach(trackId => {
      if (!currentFaceIds.has(trackId)) {
        // Face left - find the last known data
        const face = activeFaces.find(f => f.trackId === trackId);
        if (face && face.lookingDuration >= 1) {
          const record: DetectionRecord = {
            id: `${trackId}_${Date.now()}`,
            timestamp: new Date(),
            gender: face.gender,
            age: face.age,
            ageGroup: face.ageGroup,
            emotion: face.emotion.emotion,
            emotionConfidence: face.emotion.confidence,
            attentionDuration: face.lookingDuration,
            isRegistered: face.isRegistered
          };
          setDetectionHistory(prev => [record, ...prev].slice(0, 50));
        }
      }
    });

    // Update for faces currently looking (real-time log)
    activeFaces.forEach(face => {
      if (!previousFaceIds.has(face.trackId) && face.lookingDuration >= 0.5) {
        // New face detected
        const record: DetectionRecord = {
          id: `${face.trackId}_${Date.now()}`,
          timestamp: new Date(),
          gender: face.gender,
          age: face.age,
          ageGroup: face.ageGroup,
          emotion: face.emotion.emotion,
          emotionConfidence: face.emotion.confidence,
          attentionDuration: face.lookingDuration,
          isRegistered: face.isRegistered
        };
        setDetectionHistory(prev => {
          // Avoid duplicates
          if (prev.some(r => r.id.startsWith(face.trackId))) return prev;
          return [record, ...prev].slice(0, 50);
        });
      }
    });

    previousFacesRef.current = currentFaceIds;
  }, [activeFaces]);

  // List cameras
  useEffect(() => {
    const enumerateCameras = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
          stream.getTracks().forEach(track => track.stop());
        });

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices
          .filter(device => device.kind === "videoinput")
          .map((device, index) => ({
            deviceId: device.deviceId,
            label: device.label || `Câmera ${index + 1}`,
          }));

        setCameras(videoInputs);
        if (videoInputs.length > 0 && !selectedCameraId) {
          setSelectedCameraId(videoInputs[0].deviceId);
        }
      } catch (error) {
        console.error("Erro ao enumerar câmeras:", error);
      }
    };

    enumerateCameras();
  }, []);

  // Calculate statistics
  const calculateStats = () => {
    const allRecords = [...detectionHistory];
    
    // Add current active faces to stats
    activeFaces.forEach(face => {
      if (!allRecords.some(r => r.id.startsWith(face.trackId))) {
        allRecords.push({
          id: face.trackId,
          timestamp: new Date(),
          gender: face.gender,
          age: face.age,
          ageGroup: face.ageGroup,
          emotion: face.emotion.emotion,
          emotionConfidence: face.emotion.confidence,
          attentionDuration: face.lookingDuration,
          isRegistered: face.isRegistered
        });
      }
    });

    if (allRecords.length === 0) {
      return { emotions: [], genders: [], ages: [], avgAttention: 0, totalViews: 0 };
    }

    // Emotion stats
    const emotionCounts: Record<EmotionType, number> = {
      neutral: 0, happy: 0, sad: 0, angry: 0, fearful: 0, disgusted: 0, surprised: 0
    };
    allRecords.forEach(r => emotionCounts[r.emotion]++);
    const emotions: EmotionStats[] = Object.entries(emotionCounts)
      .filter(([_, count]) => count > 0)
      .map(([emotion, count]) => ({
        emotion: emotion as EmotionType,
        count,
        percentage: (count / allRecords.length) * 100
      }))
      .sort((a, b) => b.count - a.count);

    // Gender stats
    const genderCounts: Record<string, number> = { masculino: 0, feminino: 0, indefinido: 0 };
    allRecords.forEach(r => genderCounts[r.gender]++);
    const genders: GenderStats[] = Object.entries(genderCounts)
      .filter(([_, count]) => count > 0)
      .map(([gender, count]) => ({
        gender,
        count,
        percentage: (count / allRecords.length) * 100
      }));

    // Age stats
    const ageCounts: Record<string, number> = {};
    allRecords.forEach(r => {
      ageCounts[r.ageGroup] = (ageCounts[r.ageGroup] || 0) + 1;
    });
    const ages: AgeStats[] = Object.entries(ageCounts)
      .map(([ageGroup, count]) => ({
        ageGroup,
        count,
        percentage: (count / allRecords.length) * 100
      }))
      .sort((a, b) => a.ageGroup.localeCompare(b.ageGroup));

    // Average attention
    const avgAttention = allRecords.reduce((sum, r) => sum + r.attentionDuration, 0) / allRecords.length;

    return { emotions, genders, ages, avgAttention, totalViews: allRecords.length };
  };

  const stats = calculateStats();

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
      const constraints: MediaStreamConstraints = {
        video: {
          width: 1280,
          height: 720,
          ...(selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "user" }),
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setSessionStart(new Date());
        setDetectionHistory([]);

        toast({
          title: "Demo iniciada",
          description: "Sistema de coleta de dados ativo",
        });
      }
    } catch (error) {
      setCameraError("Erro ao acessar a câmera. Verifique as permissões.");
      console.error("Erro ao acessar câmera:", error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);

    toast({
      title: "Demo encerrada",
      description: `${stats.totalViews} visualizações registradas`,
    });
  };

  const getEmotionEmoji = (emotion: EmotionType): string => {
    const emotionEmojis: Record<EmotionType, string> = {
      neutral: '😐', happy: '😊', sad: '😢', angry: '😠',
      fearful: '😨', disgusted: '🤢', surprised: '😲'
    };
    return emotionEmojis[emotion] || '😐';
  };

  const getEmotionLabel = (emotion: EmotionType): string => {
    const emotionLabels: Record<EmotionType, string> = {
      neutral: 'Neutro', happy: 'Feliz', sad: 'Triste', angry: 'Irritado',
      fearful: 'Medo', disgusted: 'Nojo', surprised: 'Surpreso'
    };
    return emotionLabels[emotion] || 'Neutro';
  };

  const getEmotionColor = (emotion: EmotionType): string => {
    const colors: Record<EmotionType, string> = {
      neutral: 'bg-gray-500', happy: 'bg-green-500', sad: 'bg-blue-500',
      angry: 'bg-red-500', fearful: 'bg-purple-500', disgusted: 'bg-yellow-600', surprised: 'bg-orange-500'
    };
    return colors[emotion] || 'bg-gray-500';
  };

  const getGenderColor = (gender: string) => {
    switch (gender) {
      case "masculino": return "bg-blue-500";
      case "feminino": return "bg-pink-500";
      default: return "bg-gray-500";
    }
  };

  const getAgeGroupColor = (ageGroup: string) => {
    switch (ageGroup) {
      case "0-12": return "bg-green-500";
      case "13-18": return "bg-yellow-500";
      case "19-25": return "bg-orange-500";
      case "26-35": return "bg-red-500";
      case "36-50": return "bg-purple-500";
      case "51+": return "bg-indigo-500";
      default: return "bg-gray-500";
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const getSessionDuration = () => {
    if (!sessionStart) return '00:00';
    const diff = Math.floor((Date.now() - sessionStart.getTime()) / 1000);
    const mins = Math.floor(diff / 60).toString().padStart(2, '0');
    const secs = (diff % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Demo de Coleta de Audiência
          </h1>
          <p className="text-muted-foreground">Demonstração em tempo real do sistema de análise facial</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedCameraId}
            onValueChange={setSelectedCameraId}
            disabled={isStreaming}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecionar câmera" />
            </SelectTrigger>
            <SelectContent>
              {cameras.map((camera) => (
                <SelectItem key={camera.deviceId} value={camera.deviceId}>
                  {camera.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!isStreaming ? (
            <Button
              onClick={startCamera}
              size="lg"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              disabled={isLoading || !isModelsLoaded}
            >
              <Play className="w-5 h-5 mr-2" />
              {isLoading ? "Carregando IA..." : "Iniciar Demo"}
            </Button>
          ) : (
            <Button variant="destructive" size="lg" onClick={stopCamera}>
              <Square className="w-5 h-5 mr-2" />
              Encerrar Demo
            </Button>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Olhando Agora</p>
                <p className="text-3xl font-bold text-green-500">{totalLooking}</p>
              </div>
              <Eye className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sessão</p>
                <p className="text-3xl font-bold text-blue-500">{stats.totalViews}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Atenção Média</p>
                <p className="text-3xl font-bold text-purple-500">{stats.avgAttention.toFixed(1)}s</p>
              </div>
              <Target className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tempo Sessão</p>
                <p className="text-3xl font-bold text-orange-500">{getSessionDuration()}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status IA</p>
                <Badge variant={isModelsLoaded ? "default" : "secondary"} className="mt-1">
                  {isLoading ? "Carregando" : isModelsLoaded ? "Ativo" : "Erro"}
                </Badge>
              </div>
              <Zap className="h-8 w-8 text-cyan-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Camera Feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <CameraIcon className="w-5 h-5" />
              Feed da Câmera
              {isStreaming && (
                <Badge variant="destructive" className="animate-pulse">
                  ● AO VIVO
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <CameraIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>{cameraError}</p>
                  </div>
                </div>
              ) : !isStreaming ? (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <CameraIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">Clique em "Iniciar Demo" para começar</p>
                    <p className="text-sm text-gray-400 mt-2">O sistema irá coletar dados de audiência em tempo real</p>
                  </div>
                </div>
              ) : null}
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
            </div>
          </CardContent>
        </Card>

        {/* Active Faces */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-green-500" />
              Pessoas Detectadas
              <Badge variant="outline">{activeFaces.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {activeFaces.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aguardando detecções...</p>
                </div>
              ) : (
                activeFaces.map((face) => (
                  <FaceCard key={face.trackId} face={face} 
                    getEmotionEmoji={getEmotionEmoji}
                    getEmotionLabel={getEmotionLabel}
                    getEmotionColor={getEmotionColor}
                    getGenderColor={getGenderColor}
                    getAgeGroupColor={getAgeGroupColor}
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Emotion Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smile className="w-5 h-5" />
              Distribuição de Emoções
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.emotions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Sem dados ainda</p>
              ) : (
                stats.emotions.map((stat) => (
                  <div key={stat.emotion} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>{getEmotionEmoji(stat.emotion)} {getEmotionLabel(stat.emotion)}</span>
                      <span className="font-medium">{stat.count} ({stat.percentage.toFixed(0)}%)</span>
                    </div>
                    <Progress value={stat.percentage} className={`h-2 ${getEmotionColor(stat.emotion)}`} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Distribuição por Gênero
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.genders.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Sem dados ainda</p>
              ) : (
                stats.genders.map((stat) => (
                  <div key={stat.gender} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="capitalize">{stat.gender}</span>
                      <span className="font-medium">{stat.count} ({stat.percentage.toFixed(0)}%)</span>
                    </div>
                    <Progress value={stat.percentage} className={`h-2`} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Age Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="w-5 h-5" />
              Distribuição por Idade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.ages.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Sem dados ainda</p>
              ) : (
                stats.ages.map((stat) => (
                  <div key={stat.ageGroup} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>{stat.ageGroup} anos</span>
                      <span className="font-medium">{stat.count} ({stat.percentage.toFixed(0)}%)</span>
                    </div>
                    <Progress value={stat.percentage} className={`h-2`} />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detection Log */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Log de Detecções em Tempo Real
            <Badge variant="outline">{detectionHistory.length} registros</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Horário</th>
                  <th className="text-left py-2 px-3">Gênero</th>
                  <th className="text-left py-2 px-3">Idade</th>
                  <th className="text-left py-2 px-3">Faixa</th>
                  <th className="text-left py-2 px-3">Emoção</th>
                  <th className="text-left py-2 px-3">Confiança</th>
                  <th className="text-left py-2 px-3">Atenção</th>
                </tr>
              </thead>
              <tbody>
                {detectionHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aguardando detecções...
                    </td>
                  </tr>
                ) : (
                  detectionHistory.slice(0, 20).map((record) => (
                    <tr key={record.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">
                        {record.timestamp.toLocaleTimeString('pt-BR')}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className={`${getGenderColor(record.gender)} text-white border-none`}>
                          {record.gender}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">{record.age} anos</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className={`${getAgeGroupColor(record.ageGroup)} text-white border-none`}>
                          {record.ageGroup}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline" className={`${getEmotionColor(record.emotion)} text-white border-none`}>
                          {getEmotionEmoji(record.emotion)} {getEmotionLabel(record.emotion)}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        {(record.emotionConfidence * 100).toFixed(0)}%
                      </td>
                      <td className="py-2 px-3 font-medium">
                        {formatDuration(record.attentionDuration)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Face Card Component
const FaceCard = ({ 
  face, 
  getEmotionEmoji, 
  getEmotionLabel, 
  getEmotionColor, 
  getGenderColor, 
  getAgeGroupColor 
}: { 
  face: ActiveFace;
  getEmotionEmoji: (e: EmotionType) => string;
  getEmotionLabel: (e: EmotionType) => string;
  getEmotionColor: (e: EmotionType) => string;
  getGenderColor: (g: string) => string;
  getAgeGroupColor: (a: string) => string;
}) => {
  return (
    <div className="p-3 bg-muted rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium">
            {face.isRegistered ? face.name : `Visitante`}
          </span>
        </div>
        <div className="flex items-center gap-1 text-primary">
          <Clock className="w-4 h-4" />
          <span className="font-bold">{face.lookingDuration.toFixed(1)}s</span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline" className={`${getGenderColor(face.gender)} text-white border-none text-xs`}>
          {face.gender}
        </Badge>
        <Badge variant="outline" className={`${getAgeGroupColor(face.ageGroup)} text-white border-none text-xs`}>
          {face.age} anos
        </Badge>
        <Badge variant="outline" className={`${getEmotionColor(face.emotion.emotion)} text-white border-none text-xs`}>
          {getEmotionEmoji(face.emotion.emotion)} {getEmotionLabel(face.emotion.emotion)}
        </Badge>
      </div>
      
      <div className="text-xs text-muted-foreground">
        Confiança: {(face.emotion.confidence * 100).toFixed(0)}%
      </div>
    </div>
  );
};

export default DeviceDemo;
