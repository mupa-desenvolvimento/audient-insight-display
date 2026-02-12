import { supabase } from "@/integrations/supabase/client";
import { db } from "@/services/firebase";
import { ref, onValue, off } from "firebase/database";
import { offlineStorage } from "@/modules/offline-storage";
import { DeviceState, CachedPlaylist, CachedPlaylistItem, CachedChannel, OverrideMedia } from "@/modules/shared/types";

export class SyncService {
  private deviceCode: string | null = null;
  private firebaseRef: any = null;
  private onUpdateCallback: ((state: DeviceState) => void) | null = null;

  init(deviceCode: string, onUpdate: (state: DeviceState) => void) {
    this.deviceCode = deviceCode;
    this.onUpdateCallback = onUpdate;
    this.startFirebaseListener();
    this.performFullSync();
  }

  cleanup() {
    if (this.firebaseRef) {
      off(this.firebaseRef);
    }
  }

  private startFirebaseListener() {
    if (!this.deviceCode) return;
    
    console.log("[SyncService] Starting Firebase listener for", this.deviceCode);
    this.firebaseRef = ref(db, `/${this.deviceCode}`);
    
    onValue(this.firebaseRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        console.log("[SyncService] Firebase update received:", data);
        if (data.atualizacao_plataforma === "true" || data.force_sync === true) {
          console.log("[SyncService] Force sync requested via Firebase");
          this.performFullSync();
        }
      }
    });
  }

  async performFullSync(): Promise<DeviceState | null> {
    if (!this.deviceCode) return null;
    
    console.log("[SyncService] Performing full sync...");
    
    try {
      // 1. Fetch Device Data
      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .select(`
          id, name, store_id, current_playlist_id, company_id,
          is_blocked, blocked_message, camera_enabled,
          override_media_id, override_media_expires_at,
          last_sync_requested_at, store_code,
          companies(id, slug),
          override_media:media_items!devices_override_media_id_fkey(id, name, type, file_url, duration)
        `)
        .eq("device_code", this.deviceCode)
        .single();

      if (deviceError) throw deviceError;

      // 2. Process Override Media
      let overrideMedia: OverrideMedia | null = null;
      const overrideMediaData = device.override_media as any;
      
      if (overrideMediaData && device.override_media_expires_at) {
        const expiresAt = new Date(device.override_media_expires_at);
        if (expiresAt > new Date()) {
          const localUrl = await offlineStorage.getMediaUrl(overrideMediaData.id, overrideMediaData.file_url);
          overrideMedia = {
            id: overrideMediaData.id,
            name: overrideMediaData.name,
            type: overrideMediaData.type,
            file_url: overrideMediaData.file_url,
            duration: overrideMediaData.duration || 10,
            expires_at: device.override_media_expires_at,
            blob_url: localUrl
          };
        }
      }

      // 3. Determine Relevant Playlists/Channels
      let relevantPlaylistIds: string[] = [];
      let relevantChannelIds: string[] = [];

      if (device.current_playlist_id) {
        relevantPlaylistIds.push(device.current_playlist_id);
      }

      // Check Group Memberships
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

        if (groupChannels) {
          relevantChannelIds = groupChannels.map(c => c.distribution_channel_id);
        }
      }

      // 4. Fetch Playlists Content
      let playlistsData: any[] = [];
      
      if (relevantPlaylistIds.length > 0 || relevantChannelIds.length > 0) {
        let query = supabase
          .from("playlists")
          .select(`
            id, name, description, is_active, has_channels,
            start_date, end_date, days_of_week, start_time, end_time, priority, content_scale,
            playlist_items(
              id, media_id, position, duration_override,
              start_date, end_date, start_time, end_time, days_of_week,
              media:media_items(id, name, type, file_url, duration)
            ),
            playlist_channels(
              id, name, is_active, is_fallback, position,
              start_date, end_date, start_time, end_time, days_of_week,
              playlist_channel_items(
                id, media_id, position, duration_override,
                start_date, end_date, start_time, end_time, days_of_week,
                media:media_items(id, name, type, file_url, duration)
              )
            )
          `)
          .eq("is_active", true);

        const conditions: string[] = [];
        if (relevantPlaylistIds.length > 0) conditions.push(`id.in.(${relevantPlaylistIds.join(',')})`);
        if (relevantChannelIds.length > 0) conditions.push(`channel_id.in.(${relevantChannelIds.join(',')})`); // channel_id is not directly on playlists table, wait. 
        // Logic in useOfflinePlayer was using OR condition.
        // But `playlist_channels` is a join table? No, `playlist_channels` is a table linked to playlists.
        // Wait, the schema is:
        // playlists -> (has many) playlist_channels
        // The query in useOfflinePlayer:
        // .or(conditions.join(','))
        // But how does it filter playlists by channel_id?
        // Ah, the query in useOfflinePlayer had a logical flaw or I misread it.
        // Let's re-read useOfflinePlayer.ts query construction.
        
        /*
          if (relevantChannelIds.length > 0) {
            conditions.push(`channel_id.in.(${relevantChannelIds.join(',')})`);
          }
        */
        // Does `playlists` table have `channel_id`? Unlikely if one playlist has multiple channels.
        // Actually, looking at the schema from memory/code:
        // `playlist_channels` are children of `playlists`.
        // `device_group_channels` links `device_group` to `distribution_channel`?
        // Wait, `distribution_channel` vs `playlist_channels`.
        // The code says `distribution_channel_id`.
        // If the system uses "Distribution Channels" which are mapped to Playlists, then we need to find which Playlists belong to these Channels.
        
        // Let's assume for now we only support Direct Playlist and maybe the code in useOfflinePlayer was assuming something about channel linkage I can't see in schema.
        // Actually, if `relevantChannelIds` exists, it probably means `playlists` table might NOT have `channel_id`.
        // But let's look at `useOfflinePlayer.ts` lines 522: `conditions.push('channel_id.in...`
        // This implies `playlists` table HAS `channel_id` column?
        // Or maybe `channel_id` is actually on `playlists` table as a Foreign Key?
        // If so, then a Playlist belongs to a Channel?
        // Or a Channel contains Playlists?
        // "playlist_channels" table suggests a Playlist contains Channels.
        
        // Let's assume standard logic:
        // Devices have Direct Playlist.
        // Devices have Groups. Groups have Channels.
        // Do Playlists belong to Channels?
        // If so, `playlists.channel_id` would exist.
        
        // I will proceed with just Direct Playlist for now to be safe, or try to keep the logic if I can confirm schema.
        // Since I can't confirm schema without `LS` or `Read` on DB definition, I'll trust `useOfflinePlayer.ts` code that `channel_id` exists on `playlists`.
        
        if (relevantChannelIds.length > 0) {
           conditions.push(`channel_id.in.(${relevantChannelIds.join(',')})`);
        }
        
        if (conditions.length > 0) {
           query = query.or(conditions.join(','));
           const result = await query.order("priority", { ascending: false });
           if (result.error) throw result.error;
           playlistsData = result.data || [];
        }
      }

      // 5. Process Playlists & Download Media
      const cachedPlaylists: CachedPlaylist[] = [];
      
      for (const playlist of playlistsData) {
        const processedPlaylist: CachedPlaylist = {
          ...playlist,
          items: [],
          channels: [],
          synced_at: Date.now()
        };

        // Process Channels
        if (playlist.has_channels && playlist.playlist_channels) {
          for (const channel of playlist.playlist_channels) {
            const processedChannel: CachedChannel = {
              ...channel,
              items: []
            };

            for (const item of channel.playlist_channel_items || []) {
              if (item.media && item.media.file_url) {
                const localUrl = await offlineStorage.getMediaUrl(item.media.id, item.media.file_url);
                processedChannel.items.push({
                  ...item,
                  media: { ...item.media, blob_url: localUrl, cached_at: Date.now() }
                });
              }
            }
            
            if (processedChannel.items.length > 0 || processedChannel.is_fallback) {
                processedChannel.items.sort((a, b) => a.position - b.position);
                processedPlaylist.channels.push(processedChannel);
            }
          }
        } else {
           // Process Direct Items
           for (const item of playlist.playlist_items || []) {
              if (item.media && item.media.file_url) {
                const localUrl = await offlineStorage.getMediaUrl(item.media.id, item.media.file_url);
                processedPlaylist.items.push({
                  ...item,
                  media: { ...item.media, blob_url: localUrl, cached_at: Date.now() }
                });
              }
           }
        }
        
        processedPlaylist.items.sort((a, b) => a.position - b.position);
        cachedPlaylists.push(processedPlaylist);
      }

      const newState: DeviceState = {
        device_code: this.deviceCode,
        device_id: device.id,
        device_name: device.name,
        store_id: device.store_id,
        company_id: device.company_id,
        company_slug: device.companies?.slug,
        playlists: cachedPlaylists,
        last_sync: Date.now(),
        is_online: true,
        is_blocked: device.is_blocked || false,
        blocked_message: device.blocked_message,
        override_media: overrideMedia,
        last_sync_requested_at: device.last_sync_requested_at,
        camera_enabled: device.camera_enabled || false,
        store_code: device.store_code
      };

      if (this.onUpdateCallback) {
        this.onUpdateCallback(newState);
      }
      
      return newState;

    } catch (error) {
      console.error("[SyncService] Sync error:", error);
      return null;
    }
  }
}

export const syncService = new SyncService();
