import { useEffect } from "react";

interface KeyboardShortcutsOptions {
  onFullscreen?: () => void;
  onSync?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  itemsLength: number;
}

export const useKeyboardShortcuts = ({
  onFullscreen,
  onSync,
  onNext,
  onPrev,
  itemsLength,
}: KeyboardShortcutsOptions) => {
  useEffect(() => {
    if (itemsLength === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" || e.key === "F") onFullscreen?.();
      if (e.key === " ") {
        e.preventDefault();
        onSync?.();
      }
      if (e.key === "ArrowRight") onNext?.();
      if (e.key === "ArrowLeft") onPrev?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onFullscreen, onSync, onNext, onPrev, itemsLength]);
};
