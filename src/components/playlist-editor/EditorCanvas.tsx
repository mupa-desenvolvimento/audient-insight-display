import { useState, useRef, useEffect } from "react";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

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
    <div className="flex-1 flex flex-col bg-[#0a0a0b] min-h-0">
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
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
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
                loop
                autoPlay={isPlaying}
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
        </div>
      </div>

      {/* Controls Bar */}
      <div className="h-14 flex items-center justify-between px-4 bg-[#18181b] border-t border-white/10">
        {/* Left - Zoom Controls */}
        <div className="flex items-center gap-2 w-48">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
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
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => onZoomChange(Math.min(150, zoom + 10))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <span className="text-xs text-white/40 w-10">{zoom}%</span>
        </div>

        {/* Center - Playback Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
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
                ? "bg-white text-black hover:bg-white/90" 
                : "bg-primary text-white hover:bg-primary/90"
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
            className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
            onClick={onNext}
            disabled={currentIndex >= totalItems - 1}
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>

        {/* Right - Item Counter */}
        <div className="flex items-center gap-2 w-48 justify-end">
          <span className="text-xs text-white/40">
            {totalItems > 0 ? `${currentIndex + 1} / ${totalItems}` : "0 itens"}
          </span>
        </div>
      </div>
    </div>
  );
};
