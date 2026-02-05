import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Exporta tipos para uso externo
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
  // Campos de agendamento individual
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  days_of_week?: number[] | null;
}

export interface CachedChannel {
  id: string;
  name: string;
  is_active: boolean;
  is_fallback: boolean;
  position: number;
  start_date: string | null;
  end_date: string | null;
  start_time: string;
  end_time: string;
  days_of_week: number[] | null;
  items: CachedPlaylistItem[];
}

export interface CachedPlaylist {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  has_channels: boolean;
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[] | null;
  start_time: string | null;
  end_time: string | null;
  priority: number;
  items: CachedPlaylistItem[];
  channels: CachedChannel[];
  synced_at: number;
}

export interface OverrideMedia {
  id: string;
  name: string;
  type: string;
  file_url: string;
  duration: number;
  blob_url?: string;
  expires_at: string;
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
  // Novos campos de controle
  is_blocked: boolean;
  blocked_message: string | null;
  override_media: OverrideMedia | null;
  last_sync_requested_at: string | null;
  camera_enabled: boolean;
}

import { MediaCacheService } from "@/services/mediaCache";
import { Capacitor } from '@capacitor/core';

const STORAGE_KEY = "device_player_state";
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutos para sync completo
const CONTROL_CHECK_INTERVAL = 30 * 1000; // 30 segundos para verificar bloqueio/mídia avulsa
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

    // Se for nativo, usa MediaCacheService (Filesystem)
    if (Capacitor.isNativePlatform()) {
      try {
        // Verifica se já está em cache
        const cachedUrl = await MediaCacheService.isCached(url);
        if (cachedUrl) {
          mediaCacheRef.current.set(mediaId, cachedUrl);
          return cachedUrl;
        }

        // Se não estiver, força o download e aguarda
        const localUrl = await MediaCacheService.downloadFile(url);
        if (localUrl) {
          mediaCacheRef.current.set(mediaId, localUrl);
          return localUrl;
        }
        
        return url; // Fallback se falhar download
      } catch (e) {
        console.error(`[Native] Erro ao baixar mídia ${mediaId}:`, e);
        return url;
      }
    }

    // Se for Web, usa IndexedDB
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

  // Verifica se um canal está ativo agora
  const isChannelActiveNow = useCallback((channel: CachedChannel): boolean => {
    if (!channel.is_active) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    // Canais fallback estão sempre ativos (menor prioridade)
    if (channel.is_fallback) return true;

    // Verifica dias da semana
    if (channel.days_of_week && channel.days_of_week.length > 0) {
      if (!channel.days_of_week.includes(currentDay)) return false;
    }

    // Verifica datas
    if (channel.start_date) {
      const startDate = new Date(channel.start_date);
      if (now < startDate) return false;
    }
    if (channel.end_date) {
      const endDate = new Date(channel.end_date);
      endDate.setHours(23, 59, 59);
      if (now > endDate) return false;
    }

    // Verifica horários
    if (channel.start_time && currentTime < channel.start_time.slice(0, 5)) return false;
    if (channel.end_time && currentTime > channel.end_time.slice(0, 5)) return false;

    return true;
  }, []);

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

  // Obtém o canal ativo da playlist (com base no horário)
  const getActiveChannel = useCallback((playlist: CachedPlaylist): CachedChannel | null => {
    if (!playlist.has_channels || !playlist.channels || playlist.channels.length === 0) {
      return null;
    }

    // Filtra canais ativos e separa fallback dos normais
    const activeChannels = playlist.channels.filter(isChannelActiveNow);
    const normalChannels = activeChannels.filter(c => !c.is_fallback);
    const fallbackChannels = activeChannels.filter(c => c.is_fallback);

    // Prioridade: canal normal ativo > canal fallback
    if (normalChannels.length > 0) {
      // Retorna o de menor posição (primeira ordem)
      return normalChannels.sort((a, b) => a.position - b.position)[0];
    }

    if (fallbackChannels.length > 0) {
      return fallbackChannels.sort((a, b) => a.position - b.position)[0];
    }

    return null;
  }, [isChannelActiveNow]);

  // Obtém items ativos da playlist considerando canais
  const getActiveItems = useCallback((): CachedPlaylistItem[] => {
    const playlist = getActivePlaylist();
    if (!playlist) return [];

    // Se a playlist usa canais, buscar items do canal ativo
    if (playlist.has_channels) {
      const activeChannel = getActiveChannel(playlist);
      if (activeChannel) {
        console.log("[useOfflinePlayer] Canal ativo:", activeChannel.name, "com", activeChannel.items.length, "items");
        return activeChannel.items;
      }
      console.log("[useOfflinePlayer] Nenhum canal ativo para a playlist:", playlist.name);
      return [];
    }

    // Playlist sem canais - usa items diretos
    return playlist.items;
  }, [getActivePlaylist, getActiveChannel]);

  // Sincroniza com servidor
  const syncWithServer = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Busca dispositivo pelo código com dados da empresa e campos de controle
      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .select(`
          id, name, store_id, current_playlist_id, company_id,
          is_blocked, blocked_message, 
          override_media_id, override_media_expires_at,
          last_sync_requested_at,
          companies(id, slug),
          override_media:media_items!devices_override_media_id_fkey(id, name, type, file_url, duration)
        `)
        .eq("device_code", deviceCode)
        .single();

      if (deviceError) throw deviceError;

      // Extrai dados da empresa
      const company = device.companies as { id: string; slug: string } | null;
      
      // Processa mídia avulsa (override)
      let overrideMedia: OverrideMedia | null = null;
      const overrideMediaData = device.override_media as { id: string; name: string; type: string; file_url: string; duration: number } | null;
      
      if (overrideMediaData && device.override_media_expires_at) {
        const expiresAt = new Date(device.override_media_expires_at);
        if (expiresAt > new Date()) {
          overrideMedia = {
            id: overrideMediaData.id,
            name: overrideMediaData.name,
            type: overrideMediaData.type,
            file_url: overrideMediaData.file_url,
            duration: overrideMediaData.duration || 10,
            expires_at: device.override_media_expires_at,
          };
          
          // Adiciona mídia avulsa à lista de download
          // (será processada junto com as outras mídias)
        }
      }

      // Busca playlists associadas ao dispositivo (diretas ou via canais de distribuição)
      let relevantPlaylistIds: string[] = [];
      let relevantChannelIds: string[] = [];

      // 1. Playlist direta
      if (device.current_playlist_id) {
        relevantPlaylistIds.push(device.current_playlist_id);
      }

      // 2. Playlists via Grupos -> Canais
      const { data: groupMembers } = await supabase
        .from("device_group_members")
        .select("group_id")
        .eq("device_id", device.id);

      if (groupMembers && groupMembers.length > 0) {
        const groupIds = groupMembers.map(g => g.group_id);
        
        const { data: groupChannels } = await supabase
          .from("device_group_channels")
          .select("distribution_channel_id")
          .in("group_id", groupIds);

        if (groupChannels && groupChannels.length > 0) {
          relevantChannelIds = groupChannels.map(c => c.distribution_channel_id);
        }
      }

      // Constrói query para buscar playlists
      let query = supabase
        .from("playlists")
        .select(`
          id,
          name,
          description,
          is_active,
          has_channels,
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
            start_date,
            end_date,
            start_time,
            end_time,
            days_of_week,
            media:media_items(id, name, type, file_url, duration)
          ),
          playlist_channels(
            id,
            name,
            is_active,
            is_fallback,
            position,
            start_date,
            end_date,
            start_time,
            end_time,
            days_of_week,
            playlist_channel_items(
              id,
              media_id,
              position,
              duration_override,
              start_date,
              end_date,
              start_time,
              end_time,
              days_of_week,
              media:media_items(id, name, type, file_url, duration)
            )
          )
        `)
        .eq("is_active", true);

      // Aplica filtros de escopo
      let shouldFetch = false;
      if (relevantPlaylistIds.length > 0 || relevantChannelIds.length > 0) {
        const conditions: string[] = [];
        if (relevantPlaylistIds.length > 0) {
          conditions.push(`id.in.(${relevantPlaylistIds.join(',')})`);
        }
        if (relevantChannelIds.length > 0) {
          conditions.push(`channel_id.in.(${relevantChannelIds.join(',')})`);
        }
        
        // Se houver condições, aplica com OR. Se não, não busca nada (ou busca tudo se for fallback, mas melhor ser restritivo)
        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
          shouldFetch = true;
        }
      } else {
        // Se não tem playlist direta nem canais, não busca nada para evitar baixar o banco todo
        console.warn("[useOfflinePlayer] Dispositivo sem playlists ou canais associados.");
        // Opcional: Buscar uma playlist "default" ou "demo" se necessário
        // Por enquanto, retornamos array vazio para limpar o player
      }

      let playlistsData: any[] = [];
      let playlistsError = null;

      if (shouldFetch) {
        const result = await query.order("priority", { ascending: false });
        playlistsData = result.data || [];
        playlistsError = result.error;
      }

      if (playlistsError) throw playlistsError;

      // Prepara lista de mídias para download
      const mediaToDownload: { id: string; url: string; name: string }[] = [];
      const cachedPlaylists: CachedPlaylist[] = [];

      for (const playlist of playlistsData || []) {
        const items: CachedPlaylistItem[] = [];
        const channels: CachedChannel[] = [];
        
        // Se a playlist usa canais, processa os canais
        if (playlist.has_channels && playlist.playlist_channels) {
          for (const channel of playlist.playlist_channels) {
            const channelItems: CachedPlaylistItem[] = [];
            
            for (const item of channel.playlist_channel_items || []) {
              if (item.media && item.media.file_url) {
                mediaToDownload.push({
                  id: item.media.id,
                  url: item.media.file_url,
                  name: item.media.name,
                });

                channelItems.push({
                  id: item.id,
                  media_id: item.media_id,
                  position: item.position,
                  duration_override: item.duration_override,
                  start_date: item.start_date,
                  end_date: item.end_date,
                  start_time: item.start_time,
                  end_time: item.end_time,
                  days_of_week: item.days_of_week,
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

            if (channelItems.length > 0 || channel.is_fallback) {
              channels.push({
                id: channel.id,
                name: channel.name,
                is_active: channel.is_active,
                is_fallback: channel.is_fallback,
                position: channel.position,
                start_date: channel.start_date,
                end_date: channel.end_date,
                start_time: channel.start_time,
                end_time: channel.end_time,
                days_of_week: channel.days_of_week,
                items: channelItems.sort((a, b) => a.position - b.position),
              });
            }
          }
        } else {
          // Playlist sem canais - usa playlist_items diretamente
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
                start_date: item.start_date,
                end_date: item.end_date,
                start_time: item.start_time,
                end_time: item.end_time,
                days_of_week: item.days_of_week,
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
        }

        // Adiciona playlist se tiver conteúdo
        const hasContent = items.length > 0 || channels.some(c => c.items.length > 0);
        if (hasContent) {
          cachedPlaylists.push({
            id: playlist.id,
            name: playlist.name,
            description: playlist.description,
            is_active: playlist.is_active,
            has_channels: playlist.has_channels || false,
            start_date: playlist.start_date,
            end_date: playlist.end_date,
            days_of_week: playlist.days_of_week,
            start_time: playlist.start_time,
            end_time: playlist.end_time,
            priority: playlist.priority || 0,
            items: items.sort((a, b) => a.position - b.position),
            channels: channels.sort((a, b) => a.position - b.position),
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

      // Download da mídia avulsa se existir
      if (overrideMedia && overrideMedia.file_url) {
        setDownloadProgress({
          total: mediaToDownload.length + 1,
          downloaded: mediaToDownload.length,
          current: overrideMedia.name,
        });
        
        let blobUrl = await loadFromIndexedDB(overrideMedia.id);
        if (!blobUrl) {
          blobUrl = await downloadMedia(overrideMedia.file_url, overrideMedia.id);
        }
        if (blobUrl) {
          overrideMedia.blob_url = blobUrl;
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
        // Campos de controle
        is_blocked: device.is_blocked || false,
        blocked_message: device.blocked_message || null,
        override_media: overrideMedia,
        last_sync_requested_at: device.last_sync_requested_at || null,
      };

      setDeviceState(newState);
      saveLocalState(newState);

      // Atualiza last_seen_at no servidor
      await supabase
        .from("devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", device.id);

    } catch (e: any) {
      console.error("Erro na sincronização:", e);
      const errorMessage = e?.message || (typeof e === 'string' ? e : "Erro desconhecido");
      setSyncError(errorMessage);
      
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
      if (Capacitor.isNativePlatform()) {
        await MediaCacheService.init();
      }

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

  // Verificação rápida de comandos de controle (bloqueio, mídia avulsa) e Heartbeat
  const checkControlCommands = useCallback(async () => {
    if (!deviceState?.device_id) return;

    try {
      // 1. Atualiza Heartbeat (last_seen_at)
      await supabase
        .from("devices")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", deviceState.device_id);

      // 2. Verifica comandos
      const { data: device, error } = await supabase
        .from("devices")
        .select("is_blocked, blocked_message, override_media_id, override_media_expires_at, last_sync_requested_at, camera_enabled")
        .eq("device_code", deviceCode)
        .single();

      if (error || !device) return;

      // Verifica se houve mudança no bloqueio, mídia avulsa ou câmera
      const needsUpdate = 
        device.is_blocked !== deviceState.is_blocked ||
        device.blocked_message !== deviceState.blocked_message ||
        device.override_media_id !== (deviceState.override_media?.id || null) ||
        device.camera_enabled !== deviceState.camera_enabled;

      // Verifica se foi solicitada uma sincronização forçada
      const lastSyncRequested = device.last_sync_requested_at;
      const needsForcedSync = lastSyncRequested && 
        (!deviceState.last_sync_requested_at || lastSyncRequested > deviceState.last_sync_requested_at);

      if (needsUpdate || needsForcedSync) {
        console.log("[useOfflinePlayer] Comando de controle detectado, sincronizando...");
        await syncWithServer();
      }
    } catch (e) {
      console.error("[useOfflinePlayer] Erro ao verificar comandos:", e);
    }
  }, [deviceCode, deviceState, syncWithServer]);

  // Configura intervalos de sincronização e Realtime
  useEffect(() => {
    const fullSyncInterval = setInterval(syncWithServer, SYNC_INTERVAL);
    const controlCheckInterval = setInterval(checkControlCommands, CONTROL_CHECK_INTERVAL);

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

    // Configura Supabase Realtime para atualizações instantâneas
    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;
    
    if (deviceCode) {
      console.log("[useOfflinePlayer] Configurando Realtime para device_code:", deviceCode);
      
      realtimeChannel = supabase
        .channel(`device-updates-${deviceCode}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'devices',
            filter: `device_code=eq.${deviceCode}`,
          },
          (payload) => {
            console.log("[useOfflinePlayer] ✓ Realtime UPDATE recebido:", payload);
            console.log("[useOfflinePlayer] Disparando sincronização imediata...");
            // Dispara sincronização imediata quando o dispositivo for atualizado
            syncWithServer();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'playlists',
          },
          (payload) => {
            console.log("[useOfflinePlayer] ✓ Playlist alterada:", payload);
            // Sincroniza quando playlists são alteradas
            syncWithServer();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'playlist_items',
          },
          (payload) => {
            console.log("[useOfflinePlayer] ✓ Item de playlist alterado:", payload);
            syncWithServer();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'playlist_channel_items',
          },
          (payload) => {
            console.log("[useOfflinePlayer] ✓ Item de canal alterado:", payload);
            syncWithServer();
          }
        )
        .subscribe((status, err) => {
          console.log("[useOfflinePlayer] Realtime subscription status:", status);
          if (err) {
            console.error("[useOfflinePlayer] Realtime error:", err);
          }
          if (status === 'SUBSCRIBED') {
            console.log("[useOfflinePlayer] ✓ Realtime conectado e pronto!");
          }
        });
    }

    return () => {
      clearInterval(fullSyncInterval);
      clearInterval(controlCheckInterval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      
      // Limpa subscription Realtime
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [syncWithServer, checkControlCommands, deviceCode]);

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
    getActiveItems,
    getActiveChannel,
    syncWithServer,
    isPlaylistActiveNow,
    clearAllData,
  };
};
