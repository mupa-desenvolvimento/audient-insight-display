import { 
  DeviceState, 
  CachedPlaylist, 
  CachedChannel, 
  CachedPlaylistItem 
} from "@/modules/shared/types/DeviceTypes";

export interface PlayableItem {
  type: 'media' | 'blocked' | 'empty';
  url?: string;
  mediaType?: string;
  duration?: number;
  message?: string;
  mediaId?: string;
}

export class PlayerEngine {
  
  getCurrentItem(state: DeviceState | null): PlayableItem {
    if (!state) return { type: 'empty', message: 'Inicializando...' };

    // 1. Check Blocked
    if (state.is_blocked) {
      return { 
        type: 'blocked', 
        message: state.blocked_message || 'Dispositivo bloqueado' 
      };
    }

    // 2. Check Override Media
    if (state.override_media) {
      const expires = new Date(state.override_media.expires_at);
      if (expires > new Date()) {
        return {
          type: 'media',
          url: state.override_media.blob_url || state.override_media.file_url,
          mediaType: state.override_media.type,
          duration: state.override_media.duration,
          mediaId: state.override_media.id
        };
      }
    }

    // 3. Get Active Playlist
    const playlist = this.getActivePlaylist(state);
    if (!playlist) {
      return { type: 'empty', message: 'Nenhuma playlist ativa' };
    }

    // 4. Get Active Items
    const items = this.getActiveItems(playlist);
    if (items.length === 0) {
      return { type: 'empty', message: 'Playlist vazia' };
    }

    // Note: The actual rotation logic (index management) usually stays in the React component 
    // or we can manage it here if we pass the current index.
    // For now, I'll assume the React component asks for the "Next" item or manages the list.
    // I'll expose a method to get the full list of valid items for the current moment.
    
    return { type: 'empty', message: 'Playlist pronta' }; // Placeholder, caller should use getActiveItems
  }

  getActiveItemsForNow(state: DeviceState | null): CachedPlaylistItem[] {
    if (!state || state.is_blocked || (state.override_media && new Date(state.override_media.expires_at) > new Date())) {
      return [];
    }

    const playlist = this.getActivePlaylist(state);
    if (!playlist) return [];

    return this.getActiveItems(playlist);
  }

  private getActivePlaylist(state: DeviceState): CachedPlaylist | null {
    if (!state.playlists) return null;

    const activePlaylists = state.playlists
      .filter(p => this.isPlaylistActiveNow(p))
      .sort((a, b) => b.priority - a.priority);

    return activePlaylists[0] || null;
  }

  private isPlaylistActiveNow(playlist: CachedPlaylist): boolean {
    if (!playlist.is_active) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    if (playlist.days_of_week && playlist.days_of_week.length > 0) {
      if (!playlist.days_of_week.includes(currentDay)) return false;
    }

    if (playlist.start_date) {
      const startDate = new Date(playlist.start_date);
      if (now < startDate) return false;
    }
    if (playlist.end_date) {
      const endDate = new Date(playlist.end_date);
      endDate.setHours(23, 59, 59);
      if (now > endDate) return false;
    }

    if (playlist.start_time && currentTime < playlist.start_time) return false;
    if (playlist.end_time && currentTime > playlist.end_time) return false;

    return true;
  }

  private getActiveItems(playlist: CachedPlaylist): CachedPlaylistItem[] {
    if (playlist.has_channels) {
      const activeChannel = this.getActiveChannel(playlist);
      return activeChannel ? activeChannel.items : [];
    }
    return playlist.items;
  }

  private getActiveChannel(playlist: CachedPlaylist): CachedChannel | null {
    if (!playlist.channels || playlist.channels.length === 0) return null;

    const activeChannels = playlist.channels.filter(c => this.isChannelActiveNow(c));
    const normalChannels = activeChannels.filter(c => !c.is_fallback);
    const fallbackChannels = activeChannels.filter(c => c.is_fallback);

    if (normalChannels.length > 0) {
      return normalChannels.sort((a, b) => a.position - b.position)[0];
    }

    if (fallbackChannels.length > 0) {
      return fallbackChannels.sort((a, b) => a.position - b.position)[0];
    }

    return null;
  }

  private isChannelActiveNow(channel: CachedChannel): boolean {
    if (!channel.is_active) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    if (channel.is_fallback) return true;

    if (channel.days_of_week && channel.days_of_week.length > 0) {
      if (!channel.days_of_week.includes(currentDay)) return false;
    }

    if (channel.start_date) {
      const startDate = new Date(channel.start_date);
      if (now < startDate) return false;
    }
    if (channel.end_date) {
      const endDate = new Date(channel.end_date);
      endDate.setHours(23, 59, 59);
      if (now > endDate) return false;
    }

    if (channel.start_time && currentTime < channel.start_time.slice(0, 5)) return false;
    if (channel.end_time && currentTime > channel.end_time.slice(0, 5)) return false;

    return true;
  }
}

export const playerEngine = new PlayerEngine();
