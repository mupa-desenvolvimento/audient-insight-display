import { useState, useEffect, useCallback, useRef } from "react";
import { DeviceState, CachedPlaylistItem, OverrideMedia } from "@/modules/shared/types";
import { syncService } from "@/modules/sync-manager";
import { offlineStorage } from "@/modules/offline-storage";
import { contentScheduler } from "@/modules/content-engine";

const STORAGE_KEY = "device_player_state";

export const useOfflinePlayer = (deviceCode: string) => {
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [activeItems, setActiveItems] = useState<CachedPlaylistItem[]>([]);
  const [overrideMedia, setOverrideMedia] = useState<OverrideMedia | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Initialize
  useEffect(() => {
    const init = async () => {
      // Load local state first for offline-first experience
      const localState = offlineStorage.loadState(`${STORAGE_KEY}_${deviceCode}`);
      if (localState) {
        setDeviceState(localState);
        updateActiveContent(localState);
      }
      
      setIsLoading(false);

      // Initialize Sync Service
      syncService.init(deviceCode, (newState) => {
        setDeviceState(newState);
        offlineStorage.saveState(`${STORAGE_KEY}_${deviceCode}`, newState);
        updateActiveContent(newState);
      });
    };

    init();

    return () => {
      syncService.cleanup();
    };
  }, [deviceCode]);

  // Content Scheduler Loop (updates active items based on time)
  useEffect(() => {
    const interval = setInterval(() => {
      if (deviceState) {
        updateActiveContent(deviceState);
      }
    }, 1000 * 30); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [deviceState]);

  const updateActiveContent = (state: DeviceState) => {
    // 1. Check for valid Override Media
    if (state.override_media && state.override_media.expires_at) {
      const expiresAt = new Date(state.override_media.expires_at);
      if (expiresAt > new Date()) {
        setOverrideMedia(state.override_media);
        setActiveItems([]); // Override takes precedence
        return;
      }
    }
    setOverrideMedia(null);

    // 2. Get Scheduled Content
    const items = contentScheduler.getActiveItems(state);
    setActiveItems(items);
  };

  // Helper for manual sync (if needed by UI)
  const forceSync = useCallback(() => {
    syncService.performFullSync();
  }, []);

  return {
    deviceState,
    activeItems,
    overrideMedia,
    isLoading,
    forceSync
  };
};
