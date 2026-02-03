import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CachedMedia {
  id: string;
  name: string;
  type: string;
  file_url: string;
  duration: number;
  blob_url?: string;
  cached_at: number;
}

export interface CachedPlaylistItem {
  id: string;
  media_id: string;
  position: number;
  duration_override: number | null;
  media: CachedMedia;
}

export interface CachedPlaylist {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[] | null;
  start_time: string | null;
  end_time: string | null;
  priority: number;
  items: CachedPlaylistItem[];
  synced_at: number;
}

export interface DeviceState {
  device_code: string;
  device_id: string | null;
  device_name: string | null;
  store_id: string | null;
  company_id: string | null;
  company_slug: string | null;
  playlists: CachedPlaylist[];
  last_sync: number;
  is_online: boolean;
}

const STORAGE_KEY = "device_player_state";
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutos
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas

export const useOfflinePlayer = (deviceCode: string) => {
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{
    total: number;
    downloaded: number;
    current: string | null;
  }>({ total: 0, downloaded: 0, current: null });
  
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaCacheRef = useRef<Map<string, string>>(new Map());

  // Carrega estado do localStorage
  const loadLocalState = useCallback((): DeviceState | null => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${deviceCode}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Erro ao carregar estado local:", e);
    }
    return null;
  }, [deviceCode]);

  // Salva estado no localStorage
  const saveLocalState = useCallback((state: DeviceState) => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${deviceCode}`, JSON.stringify(state));
    } catch (e) {
      console.error("Erro ao salvar estado local:", e);
    }
  }, [deviceCode]);

  // Download e cache de mídia
  const downloadMedia = useCallback(async (url: string, mediaId: string): Promise<string> => {
    // Verifica se já está em cache
    const cached = mediaCacheRef.current.get(mediaId);
    if (cached) return cached;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      mediaCacheRef.current.set(mediaId, blobUrl);
      
      // Salva no IndexedDB para persistência
      await saveToIndexedDB(mediaId, blob);
      
      return blobUrl;
    } catch (e) {
      console.error(`Erro ao baixar mídia ${mediaId}:`, e);
      return url; // Fallback para URL original
    }
  }, []);

  // IndexedDB helpers
  const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("PlayerMediaCache", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("media")) {
          db.createObjectStore("media", { keyPath: "id" });
        }
      };
    });
  };

  const saveToIndexedDB = async (id: string, blob: Blob) => {
    try {
      const db = await openDB();
      const tx = db.transaction("media", "readwrite");
      const store = tx.objectStore("media");
      store.put({ id, blob, cached_at: Date.now() });
    } catch (e) {
      console.error("Erro ao salvar no IndexedDB:", e);
    }
  };

  const loadFromIndexedDB = async (id: string): Promise<string | null> => {
    try {
      const db = await openDB();
      const tx = db.transaction("media", "readonly");
      const store = tx.objectStore("media");
      const request = store.get(id);
      
      return new Promise((resolve) => {
        request.onsuccess = () => {
          if (request.result) {
            const blobUrl = URL.createObjectURL(request.result.blob);
            mediaCacheRef.current.set(id, blobUrl);
            resolve(blobUrl);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  };

  // Limpa todos os dados do cache
  const clearAllData = useCallback(async () => {
    console.log("[useOfflinePlayer] Limpando todos os dados...");
    
    // Limpa localStorage
    localStorage.removeItem(`${STORAGE_KEY}_${deviceCode}`);
    
    // Limpa IndexedDB
    try {
      const deleteRequest = indexedDB.deleteDatabase("PlayerMediaCache");
      await new Promise<void>((resolve, reject) => {
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
        deleteRequest.onblocked = () => {
          console.warn("[useOfflinePlayer] Database blocked, forcing close...");
          resolve();
        };
      });
    } catch (e) {
      console.error("[useOfflinePlayer] Erro ao limpar IndexedDB:", e);
    }
    
    // Revoga todas as URLs de blob
    mediaCacheRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    mediaCacheRef.current.clear();
    
    // Reseta estado
    setDeviceState(null);
    
    console.log("[useOfflinePlayer] Dados limpos com sucesso");
  }, [deviceCode]);

  // Verifica se playlist está ativa agora
  const isPlaylistActiveNow = useCallback((playlist: CachedPlaylist): boolean => {
    if (!playlist.is_active) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    // Verifica dias da semana
    if (playlist.days_of_week && playlist.days_of_week.length > 0) {
      if (!playlist.days_of_week.includes(currentDay)) return false;
    }

    // Verifica datas
    if (playlist.start_date) {
      const startDate = new Date(playlist.start_date);
      if (now < startDate) return false;
    }
    if (playlist.end_date) {
      const endDate = new Date(playlist.end_date);
      endDate.setHours(23, 59, 59);
      if (now > endDate) return false;
    }

    // Verifica horários
    if (playlist.start_time && currentTime < playlist.start_time) return false;
    if (playlist.end_time && currentTime > playlist.end_time) return false;

    return true;
  }, []);

  // Obtém playlist ativa com maior prioridade
  const getActivePlaylist = useCallback((): CachedPlaylist | null => {
    if (!deviceState?.playlists) return null;

    const activePlaylists = deviceState.playlists
      .filter(isPlaylistActiveNow)
      .sort((a, b) => b.priority - a.priority);

    return activePlaylists[0] || null;
  }, [deviceState, isPlaylistActiveNow]);

  // Sincroniza com servidor
  const syncWithServer = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Busca dispositivo pelo código com dados da empresa
      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .select("id, name, store_id, current_playlist_id, company_id, companies(id, slug)")
        .eq("device_code", deviceCode)
        .single();

      if (deviceError) throw deviceError;

      // Extrai dados da empresa
      const company = device.companies as { id: string; slug: string } | null;

      // Busca playlists associadas ao dispositivo via grupos ou diretamente
      const { data: playlistsData, error: playlistsError } = await supabase
        .from("playlists")
        .select(`
          id,
          name,
          description,
          is_active,
          start_date,
          end_date,
          days_of_week,
          start_time,
          end_time,
          priority,
          playlist_items(
            id,
            media_id,
            position,
            duration_override,
            media:media_items(id, name, type, file_url, duration)
          )
        `)
        .eq("is_active", true)
        .order("priority", { ascending: false });

      if (playlistsError) throw playlistsError;

      // Prepara lista de mídias para download
      const mediaToDownload: { id: string; url: string; name: string }[] = [];
      const cachedPlaylists: CachedPlaylist[] = [];

      for (const playlist of playlistsData || []) {
        const items: CachedPlaylistItem[] = [];
        
        for (const item of playlist.playlist_items || []) {
          if (item.media && item.media.file_url) {
            mediaToDownload.push({
              id: item.media.id,
              url: item.media.file_url,
              name: item.media.name,
            });

            items.push({
              id: item.id,
              media_id: item.media_id,
              position: item.position,
              duration_override: item.duration_override,
              media: {
                id: item.media.id,
                name: item.media.name,
                type: item.media.type,
                file_url: item.media.file_url,
                duration: item.media.duration || 10,
                cached_at: Date.now(),
              },
            });
          }
        }

        if (items.length > 0) {
          cachedPlaylists.push({
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            is_active: playlist.is_active,
            start_date: playlist.start_date,
            end_date: playlist.end_date,
            days_of_week: playlist.days_of_week,
            start_time: playlist.start_time,
            end_time: playlist.end_time,
            priority: playlist.priority || 0,
            items: items.sort((a, b) => a.position - b.position),
            synced_at: Date.now(),
          });
        }
      }

      // Download das mídias
      setDownloadProgress({ total: mediaToDownload.length, downloaded: 0, current: null });

      for (let i = 0; i < mediaToDownload.length; i++) {
        const media = mediaToDownload[i];
        setDownloadProgress({
          total: mediaToDownload.length,
          downloaded: i,
          current: media.name,
        });

        // Tenta carregar do cache primeiro
        let blobUrl = await loadFromIndexedDB(media.id);
        if (!blobUrl) {
          blobUrl = await downloadMedia(media.url, media.id);
        }

        // Atualiza URL na playlist
        for (const playlist of cachedPlaylists) {
          for (const item of playlist.items) {
            if (item.media.id === media.id && blobUrl) {
              item.media.blob_url = blobUrl;
            }
          }
        }
      }

      setDownloadProgress({ total: mediaToDownload.length, downloaded: mediaToDownload.length, current: null });

      // Atualiza estado
      const newState: DeviceState = {
        device_code: deviceCode,
        device_id: device.id,
        device_name: device.name,
        store_id: device.store_id,
        company_id: company?.id || null,
        company_slug: company?.slug || null,
        playlists: cachedPlaylists,
        last_sync: Date.now(),
        is_online: true,
      };

      setDeviceState(newState);
      saveLocalState(newState);

      // Atualiza last_seen_at no servidor
      await supabase
        .from("devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", device.id);

    } catch (e) {
      console.error("Erro na sincronização:", e);
      setSyncError(e instanceof Error ? e.message : "Erro desconhecido");
      
      // Tenta carregar do cache local
      const localState = loadLocalState();
      if (localState) {
        setDeviceState({ ...localState, is_online: false });
      }
    } finally {
      setIsSyncing(false);
    }
  }, [deviceCode, isSyncing, downloadMedia, saveLocalState, loadLocalState, loadFromIndexedDB]);

  // Inicialização
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      
      // Carrega estado local primeiro
      const localState = loadLocalState();
      if (localState) {
        // Restaura cache de mídia do IndexedDB
        for (const playlist of localState.playlists) {
          for (const item of playlist.items) {
            const blobUrl = await loadFromIndexedDB(item.media.id);
            if (blobUrl) {
              item.media.blob_url = blobUrl;
            }
          }
        }
        setDeviceState(localState);
      }

      // Sincroniza com servidor
      await syncWithServer();
      
      setIsLoading(false);
    };

    init();
  }, [deviceCode]);

  // Configura intervalo de sincronização
  useEffect(() => {
    syncIntervalRef.current = setInterval(syncWithServer, SYNC_INTERVAL);

    // Monitora conexão
    const handleOnline = () => {
      setDeviceState((prev) => prev ? { ...prev, is_online: true } : null);
      syncWithServer();
    };
    const handleOffline = () => {
      setDeviceState((prev) => prev ? { ...prev, is_online: false } : null);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncWithServer]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      mediaCacheRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  return {
    deviceState,
    isLoading,
    isSyncing,
    syncError,
    downloadProgress,
    getActivePlaylist,
    syncWithServer,
    isPlaylistActiveNow,
    clearAllData,
  };
};
