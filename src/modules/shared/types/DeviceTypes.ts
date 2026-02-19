export interface CachedMedia {
  id: string;
  name: string;
  type: string;
  file_url: string;
  duration: number;
  blob_url?: string; // Local URL (blob: or file://)
  cached_at: number;
}

export interface CachedPlaylistItem {
  id: string;
  media_id: string;
  position: number;
  duration_override: number | null;
  media: CachedMedia;
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
  content_scale?: string | null;
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
  is_blocked: boolean;
  blocked_message: string | null;
  override_media: OverrideMedia | null;
  last_sync_requested_at: string | null;
  camera_enabled: boolean;
  store_code?: string;
}
