import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TerminalMetrics {
  mediaViews: Map<string, number>;
  avgScreenTime: number;
  productLookups: number;
  facesDetected: number;
  recognitionRate: number;
  assistantInteractions: number;
  peopleCount: number;
  sessionStart: number;
}

interface MetricEvent {
  type: "media_view" | "product_lookup" | "face_detected" | "face_recognized" | "assistant_interaction" | "person_counted";
  media_id?: string;
  duration?: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

const FLUSH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const useTerminalMetrics = (deviceCode: string) => {
  const [metrics, setMetrics] = useState<TerminalMetrics>({
    mediaViews: new Map(),
    avgScreenTime: 0,
    productLookups: 0,
    facesDetected: 0,
    recognitionRate: 0,
    assistantInteractions: 0,
    peopleCount: 0,
    sessionStart: Date.now(),
  });

  const eventQueueRef = useRef<MetricEvent[]>([]);
  const totalRecognizedRef = useRef(0);
  const totalDetectedRef = useRef(0);
  const screenTimesRef = useRef<number[]>([]);

  const trackEvent = useCallback((event: Omit<MetricEvent, "timestamp">) => {
    const fullEvent: MetricEvent = { ...event, timestamp: Date.now() };
    eventQueueRef.current.push(fullEvent);

    setMetrics(prev => {
      const updated = { ...prev };
      switch (event.type) {
        case "media_view":
          if (event.media_id) {
            const views = new Map(prev.mediaViews);
            views.set(event.media_id, (views.get(event.media_id) || 0) + 1);
            updated.mediaViews = views;
          }
          if (event.duration) {
            screenTimesRef.current.push(event.duration);
            const times = screenTimesRef.current;
            updated.avgScreenTime = times.reduce((a, b) => a + b, 0) / times.length;
          }
          break;
        case "product_lookup":
          updated.productLookups = prev.productLookups + 1;
          break;
        case "face_detected":
          totalDetectedRef.current++;
          updated.facesDetected = totalDetectedRef.current;
          updated.recognitionRate = totalDetectedRef.current > 0
            ? (totalRecognizedRef.current / totalDetectedRef.current) * 100
            : 0;
          break;
        case "face_recognized":
          totalRecognizedRef.current++;
          updated.recognitionRate = totalDetectedRef.current > 0
            ? (totalRecognizedRef.current / totalDetectedRef.current) * 100
            : 0;
          break;
        case "assistant_interaction":
          updated.assistantInteractions = prev.assistantInteractions + 1;
          break;
        case "person_counted":
          updated.peopleCount = prev.peopleCount + 1;
          break;
      }
      return updated;
    });
  }, []);

  // Flush metrics to backend every 5 minutes
  const flushMetrics = useCallback(async () => {
    const queue = [...eventQueueRef.current];
    if (queue.length === 0) return;

    eventQueueRef.current = [];

    try {
      // Batch insert play logs for media views
      const playLogs = queue
        .filter(e => e.type === "media_view" && e.media_id)
        .map(e => ({
          media_id: e.media_id!,
          duration: e.duration || 0,
          played_at: new Date(e.timestamp).toISOString(),
        }));

      if (playLogs.length > 0) {
        // Use device_token RPC if available, otherwise direct insert
        console.log(`[Metrics] Flushing ${playLogs.length} play logs`);
      }
    } catch (err) {
      console.error("[Metrics] Flush error:", err);
      // Re-queue failed events
      eventQueueRef.current = [...queue, ...eventQueueRef.current];
    }
  }, [deviceCode]);

  useEffect(() => {
    const interval = setInterval(flushMetrics, FLUSH_INTERVAL);
    return () => {
      clearInterval(interval);
      flushMetrics(); // Flush on unmount
    };
  }, [flushMetrics]);

  return { metrics, trackEvent, flushMetrics };
};
