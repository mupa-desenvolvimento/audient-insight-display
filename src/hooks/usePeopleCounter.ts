import { useState, useCallback, useRef, useEffect } from "react";
import { ActiveFace } from "./useFaceDetection";

const DEDUP_INTERVAL = 10000; // 10 seconds between counting same person

export const usePeopleCounter = () => {
  const [count, setCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const seenFacesRef = useRef<Map<string, number>>(new Map());
  const lastResetRef = useRef<string>(new Date().toDateString());

  // Reset daily counter
  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== lastResetRef.current) {
        lastResetRef.current = today;
        setTodayCount(0);
        seenFacesRef.current.clear();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const processFaces = useCallback((faces: ActiveFace[]) => {
    const now = Date.now();
    let newCount = 0;

    for (const face of faces) {
      const lastSeen = seenFacesRef.current.get(face.trackId);
      if (!lastSeen || now - lastSeen > DEDUP_INTERVAL) {
        seenFacesRef.current.set(face.trackId, now);
        newCount++;
      }
    }

    if (newCount > 0) {
      setCount(prev => prev + newCount);
      setTodayCount(prev => prev + newCount);
    }

    // Cleanup old entries
    for (const [id, time] of seenFacesRef.current.entries()) {
      if (now - time > 60000) seenFacesRef.current.delete(id);
    }
  }, []);

  return { count, todayCount, processFaces };
};
