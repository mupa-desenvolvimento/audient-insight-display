import { useEffect, useCallback, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Download, 
  ExternalLink,
  Video,
  Image,
  Clock,
  HardDrive
} from "lucide-react";
import type { MediaItem } from "@/hooks/useMediaItems";

interface MediaLightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaItems: MediaItem[];
  initialIndex: number;
}

export function MediaLightbox({ 
  open, 
  onOpenChange, 
  mediaItems, 
  initialIndex 
}: MediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Reset index when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  const currentMedia = mediaItems[currentIndex];
  const hasNext = currentIndex < mediaItems.length - 1;
  const hasPrev = currentIndex > 0;

  const goNext = useCallback(() => {
    if (hasNext) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [hasNext]);

  const goPrev = useCallback(() => {
    if (hasPrev) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [hasPrev]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
        case "Escape":
          onOpenChange(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, goNext, goPrev, onOpenChange]);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  if (!currentMedia) return null;

  const isVideo = currentMedia.type === "video";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none overflow-hidden">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 h-10 w-10"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Navigation arrows */}
        {hasPrev && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
            onClick={goPrev}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
        )}
        
        {hasNext && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-50 text-white hover:bg-white/20 h-12 w-12"
            onClick={goNext}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>
        )}

        {/* Media content */}
        <div className="flex flex-col h-full">
          {/* Main content area */}
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            {currentMedia.file_url ? (
              isVideo ? (
                <video
                  key={currentMedia.id}
                  src={currentMedia.file_url}
                  className="max-w-full max-h-[calc(95vh-120px)] object-contain rounded-lg"
                  controls
                  autoPlay
                />
              ) : (
                <img
                  key={currentMedia.id}
                  src={currentMedia.file_url}
                  alt={currentMedia.name}
                  className="max-w-full max-h-[calc(95vh-120px)] object-contain rounded-lg"
                />
              )
            ) : (
              <div className="flex items-center justify-center w-full h-64 bg-muted rounded-lg">
                {isVideo ? (
                  <Video className="w-16 h-16 text-muted-foreground" />
                ) : (
                  <Image className="w-16 h-16 text-muted-foreground" />
                )}
              </div>
            )}
          </div>

          {/* Info bar */}
          <div className="bg-black/80 backdrop-blur-sm border-t border-white/10 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Left: Media info */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  {isVideo ? (
                    <Video className="w-5 h-5 text-white" />
                  ) : (
                    <Image className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-medium truncate">
                    {currentMedia.name}
                  </h3>
                  <div className="flex items-center gap-3 text-sm text-white/60">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5" />
                      {formatFileSize(currentMedia.file_size)}
                    </span>
                    {currentMedia.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(currentMedia.duration)}
                      </span>
                    )}
                    {currentMedia.resolution && (
                      <span>{currentMedia.resolution}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Center: Counter */}
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-white/10 text-white border-none">
                  {currentIndex + 1} / {mediaItems.length}
                </Badge>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {currentMedia.file_url && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={() => window.open(currentMedia.file_url!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      asChild
                    >
                      <a href={currentMedia.file_url} download={currentMedia.name}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/40 text-xs">
          Use ← → para navegar • ESC para fechar
        </div>
      </DialogContent>
    </Dialog>
  );
}