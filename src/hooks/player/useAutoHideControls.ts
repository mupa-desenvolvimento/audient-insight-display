import { useState, useEffect, useRef, useCallback } from "react";

export const useAutoHideControls = (hideDelay = 3000) => {
  const [showControls, setShowControls] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTemporarily = useCallback(() => {
    setShowControls(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowControls(false), hideDelay);
  }, [hideDelay]);

  useEffect(() => {
    const handleInteraction = () => showTemporarily();

    document.addEventListener("mousemove", handleInteraction);
    document.addEventListener("touchstart", handleInteraction);
    showTemporarily();

    return () => {
      document.removeEventListener("mousemove", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [showTemporarily]);

  return { showControls, showTemporarily };
};
