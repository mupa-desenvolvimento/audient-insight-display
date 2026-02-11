import { useState, useEffect, useRef } from "react";
import { PlaylistItem } from "@/hooks/usePlaylistItems";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, SkipBack, SkipForward, Maximize2, Volume2, VolumeX } from "lucide-react";

interface PlaylistPreviewProps {
  items: PlaylistItem[];
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export const PlaylistPreview = ({ items, isPlaying, onTogglePlay }: PlaylistPreviewProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentItem = items[currentIndex];
  const duration = currentItem?.duration_override || currentItem?.media?.duration || 10;

  useEffect(() => {
    if (!isPlaying || items.length === 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const intervalMs = 100;
    const incrementPercent = (intervalMs / (duration * 1000)) * 100;

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((idx) => (idx + 1) % items.length);
          return 0;
        }
        return prev + incrementPercent;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, currentIndex, duration, items.length]);

  useEffect(() => {
    setProgress(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [currentIndex, isPlaying]);

  const handlePrevious = () => {
    setCurrentIndex((idx) => (idx - 1 + items.length) % items.length);
    setProgress(0);
  };

  const handleNext = () => {
    setCurrentIndex((idx) => (idx + 1) % items.length);
    setProgress(0);
  };

  if (items.length === 0) {
    return (
      <div className="aspect-video bg-black rounded-lg flex items-center justify-center text-white/50">
        <p className="text-sm">Adicione mídias para visualizar</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Preview Screen */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
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
          <div className="w-full h-full flex items-center justify-center text-white/50">
            <p className="text-sm">Sem preview disponível</p>
          </div>
        )}

        {/* Overlay info */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
          <Badge variant="secondary" className="bg-black/50 text-white border-0">
            {currentIndex + 1} / {items.length}
          </Badge>
          <Badge variant="secondary" className="bg-black/50 text-white border-0">
            {currentItem?.media?.name}
          </Badge>
        </div>

        {/* Progress dots */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1">
          {items.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>

        {/* Mute button for videos */}
        {currentItem?.media?.type === "video" && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <Progress value={progress} className="h-1" />

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevious}
          className="h-9 w-9"
        >
          <SkipBack className="w-4 h-4" />
        </Button>

        <Button
          variant="default"
          size="icon"
          onClick={onTogglePlay}
          className="h-10 w-10"
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
          onClick={handleNext}
          className="h-9 w-9"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
