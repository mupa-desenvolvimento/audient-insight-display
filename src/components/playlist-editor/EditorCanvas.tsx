import { useState, useRef, useEffect, useCallback } from "react";
import { PlaylistItem } from "@/hooks/usePlaylistItems";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Maximize2, 
  Volume2, 
  VolumeX,
  ZoomIn,
  ZoomOut,
  Grid3X3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorCanvasProps {
  currentItem: PlaylistItem | undefined;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrevious: () => void;
  onNext: () => void;
  currentIndex: number;
  totalItems: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export const EditorCanvas = ({
  currentItem,
  isPlaying,
  onTogglePlay,
  onPrevious,
  onNext,
  currentIndex,
  totalItems,
  zoom,
  onZoomChange,
}: EditorCanvasProps) => {
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  // Get current item duration
  const currentDuration = currentItem?.duration_override || currentItem?.media?.duration || 10;

  // Handle auto-advance for images
  const startImageTimer = useCallback(() => {
    // Clear existing timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    
    if (!isPlaying || !currentItem || currentItem.media?.type === "video") return;

    // Progress update every 100ms
    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progressPercent = Math.min((elapsed / currentDuration) * 100, 100);
      setProgress(progressPercent);
    }, 100);

    // Advance to next item after duration
    timerRef.current = setTimeout(() => {
      if (currentIndex < totalItems - 1) {
        onNext();
      } else {
        // Loop back to start
        onNext(); // This will be handled by PlaylistEditor
      }
    }, currentDuration * 1000);
  }, [isPlaying, currentItem, currentDuration, currentIndex, totalItems, onNext]);

  // Handle video ended event
  const handleVideoEnded = useCallback(() => {
    if (isPlaying) {
      if (currentIndex < totalItems - 1) {
        onNext();
      } else {
        // Loop back to start - handled by parent
        onNext();
      }
    }
  }, [isPlaying, currentIndex, totalItems, onNext]);

  // Start/stop timers based on playing state and current item
  useEffect(() => {
    setProgress(0);
    
    if (isPlaying && currentItem) {
      if (currentItem.media?.type !== "video") {
        startImageTimer();
      }
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [currentItem?.id, isPlaying, startImageTimer]);

  // Handle video playback
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [currentItem, isPlaying]);

  const toggleFullscreen = () => {
    if (!canvasRef.current) return;
    
    if (!isFullscreen) {
      canvasRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const scaleValue = zoom / 100;

  return (
    <div className="flex-1 flex flex-col bg-background min-h-0">
      {/* Canvas Area */}
      <div 
        ref={canvasRef}
        className="flex-1 flex items-center justify-center p-6 relative overflow-hidden"
      >
        {/* Background Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />

        {/* Preview Container */}
        <div 
          className="relative bg-black rounded-lg overflow-hidden shadow-2xl transition-transform duration-200"
          style={{
            width: `${Math.min(800, 800 * scaleValue)}px`,
            aspectRatio: '16/9',
            transform: `scale(${scaleValue})`,
            transformOrigin: 'center'
          }}
        >
          {currentItem?.media?.file_url ? (
            currentItem.media.type === "video" ? (
              <video
                ref={videoRef}
                src={currentItem.media.file_url}
                className="w-full h-full object-contain"
                muted={isMuted}
                autoPlay={isPlaying}
                onEnded={handleVideoEnded}
                onTimeUpdate={(e) => {
                  const video = e.currentTarget;
                  if (video.duration) {
                    setProgress((video.currentTime / video.duration) * 100);
                  }
                }}
              />
            ) : (
              <img
                src={currentItem.media.file_url}
                alt={currentItem.media.name}
                className="w-full h-full object-contain"
              />
            )
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-white/30 gap-3">
              <Grid3X3 className="w-16 h-16" />
              <p className="text-sm">
                {totalItems === 0 
                  ? "Arraste mídias para começar" 
                  : "Selecione um item na timeline"
                }
              </p>
            </div>
          )}

          {/* Media Info Overlay */}
          {currentItem?.media && (
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-[10px] font-medium text-white/80 uppercase">
                  {currentItem.media.type}
                </span>
                <span className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-[10px] text-white/60 truncate max-w-[200px]">
                  {currentItem.media.name}
                </span>
              </div>
              
              {currentItem.media.type === "video" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white/70 hover:text-white"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </Button>
              )}
            </div>
          )}

          {/* Fullscreen button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 h-7 w-7 bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white/70 hover:text-white"
            onClick={toggleFullscreen}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>

          {/* Progress bar */}
          {isPlaying && currentItem && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
              <div 
                className="h-full bg-primary transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="h-14 flex items-center justify-between px-4 bg-muted/50 border-t border-border">
        {/* Left - Zoom Controls */}
        <div className="flex items-center gap-2 w-48">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onZoomChange(Math.max(50, zoom - 10))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Slider
            value={[zoom]}
            min={50}
            max={150}
            step={10}
            onValueChange={([v]) => onZoomChange(v)}
            className="w-24"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onZoomChange(Math.min(150, zoom + 10))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground w-10">{zoom}%</span>
        </div>

        {/* Center - Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onPrevious}
            disabled={currentIndex <= 0}
          >
            <SkipBack className="w-5 h-5" />
          </Button>

          <Button
            size="icon"
            className={cn(
              "h-10 w-10 rounded-full transition-all",
              isPlaying 
                ? "bg-foreground text-background hover:bg-foreground/90" 
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
            onClick={onTogglePlay}
            disabled={totalItems === 0}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onNext}
            disabled={currentIndex >= totalItems - 1}
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>

        {/* Right - Item Counter */}
        <div className="flex items-center gap-2 w-48 justify-end">
          <span className="text-xs text-muted-foreground">
            {totalItems > 0 ? `${currentIndex + 1} / ${totalItems}` : "0 itens"}
          </span>
        </div>
      </div>
    </div>
  );
};
