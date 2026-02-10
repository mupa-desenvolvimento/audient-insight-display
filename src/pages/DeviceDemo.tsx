import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
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
import { RegistrationDialog } from "@/components/RegistrationDialog";
import { UserPlus } from "lucide-react";

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

interface DemoMedia {
  id: number | string;
  type: 'image' | 'video';
  url: string;
  title: string;
  duration: number;
}

const DEMO_PLAYLIST: DemoMedia[] = [
  { id: 1, type: 'image', url: '/terminal_Mupa1.jpeg', title: 'Campanha: Coleção de Verão', duration: 8000 },
  { id: 2, type: 'video', url: '/terminal_video_mupa.mp4', title: 'Vídeo: Institucional MUPA', duration: 0 }, // 0 means use video duration
];

import { TutorialGuide } from "@/components/TutorialGuide";

const DeviceDemo = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [detectionHistory, setDetectionHistory] = useState<DetectionRecord[]>([]);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  
  // Playlist State
  const [playlistItems, setPlaylistItems] = useState<DemoMedia[]>(DEMO_PLAYLIST);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const mediaVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const fetchDemoPlaylist = async () => {
      try {
        const { data: playlist } = await supabase
          .from('playlists')
          .select('id')
          .eq('name', 'demoplaylist')
          .maybeSingle();

        if (playlist) {
          const { data: items } = await supabase
            .from('playlist_items')
            .select(`
              *,
              media:media_items(id, name, type, file_url, duration)
            `)
            .eq('playlist_id', playlist.id)
            .order('position');

          if (items && items.length > 0) {
            const mappedItems: DemoMedia[] = items
              .filter(item => item.media && item.media.file_url)
              .map(item => ({
                id: item.media!.id,
                type: (item.media!.type === 'video' ? 'video' : 'image') as 'image' | 'video',
                url: item.media!.file_url!,
                title: item.media!.name,
                duration: (item.duration_override || item.media!.duration || 10) * 1000 // Convert to ms for setTimeout
              }));
            
            if (mappedItems.length > 0) {
              setPlaylistItems(mappedItems);
              setCurrentMediaIndex(0);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching demo playlist:", error);
      }
    };

    fetchDemoPlaylist();
  }, []);

  useEffect(() => {
    if (playlistItems.length === 0) return;

    const currentMedia = playlistItems[currentMediaIndex];
    
    if (currentMedia.type === 'image') {
      const timer = setTimeout(() => {
        setCurrentMediaIndex((prev) => (prev + 1) % playlistItems.length);
      }, currentMedia.duration);
      return () => clearTimeout(timer);
    }
    // For video, we handle onEnded in the element
  }, [currentMediaIndex, playlistItems]);

  const handleVideoEnd = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % playlistItems.length);
  };

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

  const startCamera = async (retryCount = 0) => {
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
    } catch (error: any) {
      console.error("Erro ao acessar câmera:", error);
      
      // Retry logic for NotReadableError (common when device is busy)
      if (retryCount < 3 && (error.name === 'NotReadableError' || error.name === 'TrackStartError')) {
         console.log(`Camera busy, retrying... (${retryCount + 1}/3)`);
         setTimeout(() => startCamera(retryCount + 1), 500);
         return;
      }

      let errorMessage = "Erro ao acessar a câmera. Verifique as permissões.";
      if (error.name === 'NotAllowedError') errorMessage = "Permissão de câmera negada.";
      if (error.name === 'NotFoundError') errorMessage = "Câmera não encontrada.";
      if (error.name === 'NotReadableError') errorMessage = "A câmera está em uso por outro aplicativo.";

      setCameraError(errorMessage);
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
    <div className="h-screen w-full bg-background overflow-hidden flex flex-col animate-fade-in">
      {/* Header */}
      <div id="demo-header" className="flex-none p-4 pb-2 flex flex-col md:flex-row justify-between items-center gap-4 border-b bg-card/50 backdrop-blur-sm z-10">
        <div>
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Demo de Coleta de Audiência
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">Demonstração em tempo real do sistema de análise facial</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedCameraId}
            onValueChange={setSelectedCameraId}
            disabled={isStreaming}
          >
            <SelectTrigger className="w-[180px] h-9">
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

          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={() => {
              if (isStreaming) {
                stopCamera();
              }
              setIsRegistrationOpen(true);
            }}
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Cadastrar</span>
          </Button>

          {!isStreaming ? (
            <Button
              onClick={startCamera}
              size="sm"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white h-9"
              disabled={isLoading || !isModelsLoaded}
            >
              <Play className="w-4 h-4 mr-2" />
              {isLoading ? "Carregando..." : "Iniciar"}
            </Button>
          ) : (
            <Button id="btn-start" variant="destructive" size="sm" onClick={stopCamera} className="h-9">
              <Square className="w-4 h-4 mr-2" />
              Encerrar
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 p-4 grid grid-cols-12 gap-4 min-h-0 overflow-hidden">
        
        {/* Left Column: Camera & Active Faces (3 cols) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-full min-h-0 overflow-hidden">
          {/* Camera Feed */}
          <Card id="camera-feed" className="flex-none overflow-hidden bg-black border-0 relative group shrink-0">
             <CardHeader className="p-3 pb-2 absolute top-0 left-0 w-full z-10 bg-gradient-to-b from-black/80 to-transparent">
               <CardTitle className="flex items-center gap-2 text-white text-sm">
                 <CameraIcon className="w-4 h-4" />
                 Feed da Câmera
                 {isStreaming && (
                   <Badge variant="destructive" className="h-5 px-1.5 text-[10px] animate-pulse">
                     AO VIVO
                   </Badge>
                 )}
               </CardTitle>
             </CardHeader>
             <div className="relative aspect-video bg-black">
                {cameraError ? (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center p-4">
                      <CameraIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">{cameraError}</p>
                    </div>
                  </div>
                ) : !isStreaming ? (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <div className="text-center p-4">
                      <CameraIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm font-medium">Câmera Pausada</p>
                    </div>
                  </div>
                ) : null}
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />
             </div>
          </Card>

          {/* Active Faces List */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="p-3 pb-2 shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4 text-green-500" />
                Pessoas Detectadas
                <Badge variant="outline" className="h-5">{activeFaces.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex-1 overflow-y-auto space-y-2 custom-scrollbar">
              {activeFaces.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Aguardando...</p>
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
            </CardContent>
          </Card>
        </div>

        {/* Center Column: Stats, Media, Logs (6 cols) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-4 h-full min-h-0 overflow-hidden">
          
          {/* Stats Row */}
          <div className="grid grid-cols-5 gap-2 shrink-0">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
              <CardContent className="p-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold">Olhando</span>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-bold text-green-500 leading-none">{totalLooking}</span>
                    <Eye className="h-4 w-4 text-green-500/50 mb-0.5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
              <CardContent className="p-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold">Total</span>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-bold text-blue-500 leading-none">{stats.totalViews}</span>
                    <Users className="h-4 w-4 text-blue-500/50 mb-0.5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
              <CardContent className="p-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold">Atenção</span>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-bold text-purple-500 leading-none">{stats.avgAttention.toFixed(1)}s</span>
                    <Target className="h-4 w-4 text-purple-500/50 mb-0.5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
              <CardContent className="p-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold">Duração</span>
                  <div className="flex items-end justify-between">
                    <span className="text-xl font-bold text-orange-500 leading-none tracking-tighter">{getSessionDuration()}</span>
                    <Clock className="h-4 w-4 text-orange-500/50 mb-0.5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
              <CardContent className="p-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold">Status IA</span>
                  <div className="flex items-end justify-between">
                    <span className={`text-sm font-bold leading-tight ${isModelsLoaded ? "text-cyan-500" : "text-yellow-500"}`}>
                       {isLoading ? "Carregando" : isModelsLoaded ? "Ativo" : "Erro"}
                    </span>
                    <Zap className="h-4 w-4 text-cyan-500/50 mb-0.5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Media Player - Main Focus */}
          <Card id="media-player" className="flex-[3] flex flex-col min-h-0 overflow-hidden border-2 border-primary/20 shadow-lg relative">
            <CardHeader className="p-3 pb-2 bg-muted/30 shrink-0">
               <CardTitle className="flex items-center justify-between text-sm">
                 <span className="flex items-center gap-2"><Play className="w-4 h-4 text-primary" /> Conteúdo em Exibição</span>
                 {activeFaces.length > 0 && (
                   <Badge variant="default" className="bg-green-600 animate-pulse h-5 text-[10px]">
                     <Eye className="w-3 h-3 mr-1" /> {activeFaces.length} Olhando
                   </Badge>
                 )}
               </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 bg-black relative flex items-center justify-center overflow-hidden">
               {playlistItems.length > 0 && playlistItems[currentMediaIndex] ? (
                  <>
                    {playlistItems[currentMediaIndex].type === 'image' ? (
                      <img 
                        src={playlistItems[currentMediaIndex].url} 
                        alt={playlistItems[currentMediaIndex].title}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <video
                        ref={mediaVideoRef}
                        src={playlistItems[currentMediaIndex].url}
                        className="w-full h-full object-contain"
                        autoPlay
                        muted
                        playsInline
                        onEnded={handleVideoEnd}
                      />
                    )}
                    
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white pointer-events-none">
                      <p className="font-bold text-lg leading-tight mb-1">{playlistItems[currentMediaIndex].title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-white/20 text-white border-none h-5 text-[10px]">
                          {playlistItems[currentMediaIndex].type === 'video' ? 'Vídeo' : 'Imagem'}
                        </Badge>
                        {activeFaces.length > 0 && (
                          <span className="text-xs text-green-400 font-medium flex items-center gap-1 animate-pulse">
                            <Eye className="w-3 h-3" />
                            Detectando atenção
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-white text-center p-4">
                    <p>Carregando playlist...</p>
                  </div>
                )}
            </CardContent>
          </Card>

          {/* Detection Log Table */}
          <Card className="flex-[2] flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="p-3 pb-2 shrink-0 border-b">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4" />
                Log de Detecções
                <Badge variant="outline" className="h-5 ml-auto">{detectionHistory.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto custom-scrollbar bg-muted/10">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 px-3 font-medium">Horário</th>
                    <th className="text-left py-2 px-3 font-medium">Gênero</th>
                    <th className="text-left py-2 px-3 font-medium">Idade</th>
                    <th className="text-left py-2 px-3 font-medium">Emoção</th>
                    <th className="text-left py-2 px-3 font-medium">Atenção</th>
                  </tr>
                </thead>
                <tbody>
                  {detectionHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        Aguardando detecções...
                      </td>
                    </tr>
                  ) : (
                    detectionHistory.slice(0, 50).map((record) => (
                      <tr key={record.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-1.5 px-3">
                          {record.timestamp.toLocaleTimeString('pt-BR')}
                        </td>
                        <td className="py-1.5 px-3">
                          <span className={`inline-block w-2 h-2 rounded-full mr-1 ${getGenderColor(record.gender)}`}></span>
                          {record.gender}
                        </td>
                        <td className="py-1.5 px-3">
                           <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getAgeGroupColor(record.ageGroup)} border-none text-white`}>
                             {record.age}
                           </span>
                        </td>
                        <td className="py-1.5 px-3 flex items-center gap-1">
                          <span>{getEmotionEmoji(record.emotion)}</span>
                          <span className="truncate max-w-[60px]">{getEmotionLabel(record.emotion)}</span>
                        </td>
                        <td className="py-1.5 px-3 font-medium font-mono text-primary">
                          {formatDuration(record.attentionDuration)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Analytics (3 cols) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-full min-h-0 overflow-hidden">
          {/* Emotion Distribution */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="p-3 pb-2 shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Smile className="w-4 h-4" />
                Emoções
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2.5">
                {stats.emotions.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-4">Sem dados</p>
                ) : (
                  stats.emotions.map((stat) => (
                    <div key={stat.emotion} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="flex items-center gap-1">
                          {getEmotionEmoji(stat.emotion)} {getEmotionLabel(stat.emotion)}
                        </span>
                        <span className="font-medium text-muted-foreground">{stat.percentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={stat.percentage} className={`h-1.5 ${getEmotionColor(stat.emotion)}`} />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Gender Distribution */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="p-3 pb-2 shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                Gênero
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2.5">
                {stats.genders.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-4">Sem dados</p>
                ) : (
                  stats.genders.map((stat) => (
                    <div key={stat.gender} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="capitalize">{stat.gender}</span>
                        <span className="font-medium text-muted-foreground">{stat.percentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={stat.percentage} className={`h-1.5 bg-primary/20`} indicatorClassName={getGenderColor(stat.gender).replace('text-', 'bg-')} />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Age Distribution */}
          <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <CardHeader className="p-3 pb-2 shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="w-4 h-4" />
                Idade
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2.5">
                {stats.ages.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-4">Sem dados</p>
                ) : (
                  stats.ages.map((stat) => (
                    <div key={stat.ageGroup} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span>{stat.ageGroup}</span>
                        <span className="font-medium text-muted-foreground">{stat.percentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={stat.percentage} className={`h-1.5 bg-primary/20`} indicatorClassName={getAgeGroupColor(stat.ageGroup).replace('text-', 'bg-')} />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      <RegistrationDialog 
        isOpen={isRegistrationOpen} 
        onOpenChange={setIsRegistrationOpen}
      />
      <TutorialGuide />
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
