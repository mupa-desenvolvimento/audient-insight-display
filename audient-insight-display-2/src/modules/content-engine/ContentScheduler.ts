import { CachedPlaylist, CachedChannel, CachedPlaylistItem, DeviceState } from "@/modules/shared/types";

export class ContentScheduler {
  
  isChannelActiveNow(channel: CachedChannel): boolean {
    if (!channel.is_active) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    // Fallback channels are always active (lowest priority)
    if (channel.is_fallback) return true;

    // Check days of week
    if (channel.days_of_week && channel.days_of_week.length > 0) {
      if (!channel.days_of_week.includes(currentDay)) return false;
    }

    // Check dates
    if (channel.start_date) {
      const startDate = new Date(channel.start_date);
      if (now < startDate) return false;
    }
    if (channel.end_date) {
      const endDate = new Date(channel.end_date);
      endDate.setHours(23, 59, 59);
      if (now > endDate) return false;
    }

    // Check times
    if (channel.start_time && currentTime < channel.start_time.slice(0, 5)) return false;
    if (channel.end_time && currentTime > channel.end_time.slice(0, 5)) return false;

    return true;
  }

  isPlaylistActiveNow(playlist: CachedPlaylist): boolean {
    if (!playlist.is_active) return false;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    // Check days of week
    if (playlist.days_of_week && playlist.days_of_week.length > 0) {
      if (!playlist.days_of_week.includes(currentDay)) return false;
    }

    // Check dates
    if (playlist.start_date) {
      const startDate = new Date(playlist.start_date);
      if (now < startDate) return false;
    }
    if (playlist.end_date) {
      const endDate = new Date(playlist.end_date);
      endDate.setHours(23, 59, 59);
      if (now > endDate) return false;
    }

    // Check times
    if (playlist.start_time && currentTime < playlist.start_time) return false;
    if (playlist.end_time && currentTime > playlist.end_time) return false;

    return true;
  }

  getActivePlaylist(state: DeviceState | null): CachedPlaylist | null {
    if (!state?.playlists) return null;

    const activePlaylists = state.playlists
      .filter(p => this.isPlaylistActiveNow(p))
      .sort((a, b) => b.priority - a.priority);

    return activePlaylists[0] || null;
  }

  getActiveChannel(playlist: CachedPlaylist): CachedChannel | null {
    if (!playlist.has_channels || !playlist.channels || playlist.channels.length === 0) {
      return null;
    }

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

  getActiveItems(state: DeviceState | null): CachedPlaylistItem[] {
    const playlist = this.getActivePlaylist(state);
    if (!playlist) return [];

    if (playlist.has_channels) {
      const activeChannel = this.getActiveChannel(playlist);
      if (activeChannel) {
        return activeChannel.items;
      }
      return [];
    }

    return playlist.items;
  }
}

export const contentScheduler = new ContentScheduler();
