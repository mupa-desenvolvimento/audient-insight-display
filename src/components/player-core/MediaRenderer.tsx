import { useRef, useEffect } from "react";
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
}: MediaRendererProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const objectFitClass = {
    fill: "object-fill",
    cover: "object-cover",
    contain: "object-contain",
  }[objectFit];

  useEffect(() => {
    if (media.type === "video" && videoRef.current && autoPlay) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(console.error);
    }
  }, [media, autoPlay]);

  if (media.type === "video") {
    return (
      <video
        ref={videoRef}
        key={media.id}
        src={mediaUrl}
        className={cn("w-full h-full", objectFitClass, transitionClass)}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        loop={loop}
        onEnded={onEnded}
      />
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
