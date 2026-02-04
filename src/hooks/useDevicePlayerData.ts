import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MediaItem {
  id: string;
  name: string;
  type: string;
  file_url: string | null;
  duration: number | null;
}

export interface DevicePlayerData {
  device: {
    id: string;
    device_code: string;
    name: string;
    current_playlist_id: string | null;
    is_blocked: boolean;
    blocked_message: string | null;
    override_media_id: string | null;
    override_media_expires_at: string | null;
  } | null;
  playlist: {
    id: string;
    name: string;
    has_channels: boolean;
    content_scale: string | null;
  } | null;
  mediaItems: MediaItem[];
  overrideMedia: MediaItem | null;
}

export const useDevicePlayerData = (deviceCode: string | undefined) => {
  return useQuery({
    queryKey: ["device-player-data", deviceCode],
    queryFn: async (): Promise<DevicePlayerData> => {
      if (!deviceCode) {
        return { device: null, playlist: null, mediaItems: [], overrideMedia: null };
      }

      // Fetch device by device_code
      const { data: device, error: deviceError } = await supabase
        .from("devices")
        .select(`
          id,
          device_code,
          name,
          current_playlist_id,
          is_blocked,
          blocked_message,
          override_media_id,
          override_media_expires_at
        `)
        .eq("device_code", deviceCode)
        .maybeSingle();

      if (deviceError) throw deviceError;
      if (!device) {
        return { device: null, playlist: null, mediaItems: [], overrideMedia: null };
      }

      // Check if there's an override media
      let overrideMedia: MediaItem | null = null;
      if (device.override_media_id) {
        const expiresAt = device.override_media_expires_at ? new Date(device.override_media_expires_at) : null;
        const isExpired = expiresAt && expiresAt < new Date();
        
        if (!isExpired) {
          const { data: overrideData } = await supabase
            .from("media_items")
            .select("id, name, type, file_url, duration")
            .eq("id", device.override_media_id)
            .maybeSingle();
          
          if (overrideData) {
            overrideMedia = overrideData;
          }
        }
      }

      // If no playlist assigned, return empty
      if (!device.current_playlist_id) {
        return { device, playlist: null, mediaItems: [], overrideMedia };
      }

      // Fetch playlist
      const { data: playlist, error: playlistError } = await supabase
        .from("playlists")
        .select("id, name, has_channels, content_scale")
        .eq("id", device.current_playlist_id)
        .maybeSingle();

      if (playlistError) throw playlistError;
      if (!playlist) {
        return { device, playlist: null, mediaItems: [], overrideMedia };
      }

      let mediaItems: MediaItem[] = [];

      if (playlist.has_channels) {
        // Playlist with channels - get active channel based on time
        const now = new Date();
        const currentDay = now.getDay();
        const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS

        // Fetch all channels for this playlist
        const { data: channels } = await supabase
          .from("playlist_channels")
          .select("*")
          .eq("playlist_id", playlist.id)
          .eq("is_active", true)
          .order("position", { ascending: true });

        if (channels && channels.length > 0) {
          // Find the active channel
          let activeChannel = channels.find(channel => {
            const daysOfWeek = channel.days_of_week || [0, 1, 2, 3, 4, 5, 6];
            if (!daysOfWeek.includes(currentDay)) return false;

            const startTime = channel.start_time;
            const endTime = channel.end_time;

            // Handle overnight schedules
            if (startTime > endTime) {
              return currentTime >= startTime || currentTime <= endTime;
            }

            return currentTime >= startTime && currentTime <= endTime;
          });

          // Fallback to fallback channel if no active channel
          if (!activeChannel) {
            activeChannel = channels.find(c => c.is_fallback);
          }

          if (activeChannel) {
            // Fetch items from the active channel
            const { data: channelItems } = await supabase
              .from("playlist_channel_items")
              .select(`
                id,
                position,
                duration_override,
                media:media_items(id, name, type, file_url, duration)
              `)
              .eq("channel_id", activeChannel.id)
              .order("position", { ascending: true });

            if (channelItems) {
              mediaItems = channelItems
                .filter(item => item.media)
                .map(item => ({
                  id: item.media!.id,
                  name: item.media!.name,
                  type: item.media!.type,
                  file_url: item.media!.file_url,
                  duration: item.duration_override || item.media!.duration,
                }));
            }
          }
        }
      } else {
        // Simple playlist without channels
        const { data: playlistItems } = await supabase
          .from("playlist_items")
          .select(`
            id,
            position,
            duration_override,
            media:media_items(id, name, type, file_url, duration)
          `)
          .eq("playlist_id", playlist.id)
          .order("position", { ascending: true });

        if (playlistItems) {
          mediaItems = playlistItems
            .filter(item => item.media)
            .map(item => ({
              id: item.media!.id,
              name: item.media!.name,
              type: item.media!.type,
              file_url: item.media!.file_url,
              duration: item.duration_override || item.media!.duration,
            }));
        }
      }

      return { device, playlist, mediaItems, overrideMedia };
    },
    enabled: !!deviceCode,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};
