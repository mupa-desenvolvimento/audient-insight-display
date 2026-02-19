import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface MediaItem {
  id: string;
  name: string;
  type: string;
  file_url: string | null;
  blob_url?: string;
  duration: number | null;
}

interface MediaRendererProps {
  media: MediaItem;
  mediaUrl: string;
  objectFit?: "fill" | "cover" | "contain";
  transitionClass?: string;
  onEnded?: () => void;
  onImageError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  nextMediaUrl?: string; // URL para pré-carregar o próximo
}

export const MediaRenderer = ({
  media,
  mediaUrl,
  objectFit = "fill",
  transitionClass = "",
  onEnded,
  onImageError,
  autoPlay = true,
  muted = true,
  loop = false,
  nextMediaUrl,
}: MediaRendererProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isBuffering, setIsBuffering] = useState(false);

  const objectFitClass = {
    fill: "object-fill",
    cover: "object-cover",
    contain: "object-contain",
  }[objectFit];

  useEffect(() => {
    if (media.type === "video" && videoRef.current) {
      const video = videoRef.current;
      video.currentTime = 0;
      setIsBuffering(false);

      const playVideo = () => {
        video.play().catch(() => {
          // Autoplay bloqueado (comum em WebViews) — tenta com muted forçado
          video.muted = true;
          video.play().catch(console.error);
        });
      };

      if (video.readyState >= 3) {
        // HAVE_FUTURE_DATA ou superior — pode reproduzir sem buffering
        playVideo();
      } else {
        setIsBuffering(true);
        const onCanPlay = () => {
          setIsBuffering(false);
          playVideo();
          video.removeEventListener("canplay", onCanPlay);
        };
        video.addEventListener("canplay", onCanPlay);
        return () => video.removeEventListener("canplay", onCanPlay);
      }
    }
  }, [media.id, autoPlay]);

  if (media.type === "video") {
    return (
      <>
        <video
          ref={videoRef}
          key={media.id}
          src={mediaUrl}
          className={cn("w-full h-full", objectFitClass, transitionClass)}
          autoPlay={autoPlay}
          muted={muted}
          playsInline
          loop={loop}
          preload="auto"
          onEnded={onEnded}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
        />
        {/* Pré-carrega o próximo vídeo silenciosamente em background */}
        {nextMediaUrl && nextMediaUrl !== mediaUrl && (
          <video
            key={`preload-${nextMediaUrl}`}
            src={nextMediaUrl}
            preload="auto"
            muted
            playsInline
            style={{ width: 0, height: 0, position: "absolute", opacity: 0, pointerEvents: "none" }}
            aria-hidden="true"
          />
        )}
        {/* Spinner de buffering */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </>
    );
  }

  return (
    <img
      key={media.id}
      src={mediaUrl}
      alt={media.name}
      className={cn("w-full h-full", objectFitClass, transitionClass)}
      onError={onImageError}
    />
  );
};
