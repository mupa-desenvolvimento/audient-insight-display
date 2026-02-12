import { useEffect, useRef } from 'react';
import { analyticsService } from '@/modules/analytics-engine';

interface SystemMonitorProps {
  deviceCode: string;
}

export const SystemMonitor = ({ deviceCode }: SystemMonitorProps) => {
  const lastHeartbeatRef = useRef<number>(Date.now());

  useEffect(() => {
    // Log startup
    console.log("[SystemMonitor] System started/resumed");
    analyticsService.logPlay({
      device_id: deviceCode,
      media_id: 'system_start',
      media_name: 'System Start',
      playlist_id: 'system',
      started_at: new Date().toISOString(),
      duration_seconds: 0
    });

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = now - lastHeartbeatRef.current;
      
      // Update local heartbeat
      localStorage.setItem('mupa_heartbeat', now.toString());
      lastHeartbeatRef.current = now;

      // Basic watchdog logic could go here
      // e.g. if diff > 60000 (1 min), it means the thread was blocked or sleep mode
      if (diff > 60000) {
        console.warn("[SystemMonitor] Thread lag detected or wake from sleep", diff);
      }

    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [deviceCode]);

  return null;
};
