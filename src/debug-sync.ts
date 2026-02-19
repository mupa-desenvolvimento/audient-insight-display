
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- SCHEDULER LOGIC (Copied for testing) ---
function isChannelActiveNow(channel: any): boolean {
    if (!channel.is_active) {
        console.log(`Channel ${channel.name} inactive: is_active is false`);
        return false;
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    // Fallback channels are always active (lowest priority)
    if (channel.is_fallback) return true;

    // Check days of week
    if (channel.days_of_week && channel.days_of_week.length > 0) {
      if (!channel.days_of_week.includes(currentDay)) {
        console.log(`Channel ${channel.name} inactive: day ${currentDay} not in ${channel.days_of_week}`);
        return false;
      }
    }

    // Check dates
    if (channel.start_date) {
      const startDate = new Date(channel.start_date);
      if (now < startDate) {
        console.log(`Channel ${channel.name} inactive: now < start_date (${channel.start_date})`);
        return false;
      }
    }
    if (channel.end_date) {
      const endDate = new Date(channel.end_date);
      endDate.setHours(23, 59, 59);
      if (now > endDate) {
        console.log(`Channel ${channel.name} inactive: now > end_date (${channel.end_date})`);
        return false;
      }
    }

    // Check times
    if (channel.start_time && currentTime < channel.start_time.slice(0, 5)) {
        console.log(`Channel ${channel.name} inactive: time ${currentTime} < start_time (${channel.start_time})`);
        return false;
    }
    if (channel.end_time && currentTime > channel.end_time.slice(0, 5)) {
        console.log(`Channel ${channel.name} inactive: time ${currentTime} > end_time (${channel.end_time})`);
        return false;
    }

    return true;
}

function isPlaylistActiveNow(playlist: any): boolean {
    if (!playlist.is_active) {
        console.log(`Playlist ${playlist.name} inactive: is_active is false`);
        return false;
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    // Check days of week
    if (playlist.days_of_week && playlist.days_of_week.length > 0) {
      if (!playlist.days_of_week.includes(currentDay)) {
        console.log(`Playlist ${playlist.name} inactive: day ${currentDay} not in ${playlist.days_of_week}`);
        return false;
      }
    }

    // Check dates
    if (playlist.start_date) {
      const startDate = new Date(playlist.start_date);
      if (now < startDate) {
        console.log(`Playlist ${playlist.name} inactive: now < start_date (${playlist.start_date})`);
        return false;
      }
    }
    if (playlist.end_date) {
      const endDate = new Date(playlist.end_date);
      endDate.setHours(23, 59, 59);
      if (now > endDate) {
        console.log(`Playlist ${playlist.name} inactive: now > end_date (${playlist.end_date})`);
        return false;
      }
    }

    // Check times
    if (playlist.start_time && currentTime < playlist.start_time) {
        console.log(`Playlist ${playlist.name} inactive: time ${currentTime} < start_time (${playlist.start_time})`);
        return false;
    }
    if (playlist.end_time && currentTime > playlist.end_time) {
        console.log(`Playlist ${playlist.name} inactive: time ${currentTime} > end_time (${playlist.end_time})`);
        return false;
    }

    return true;
}
// ---------------------------------------------
function getActiveChannel(playlist: any): any | null {
    if (!playlist.has_channels || !playlist.playlist_channels || playlist.playlist_channels.length === 0) {
        return null;
    }

    const activeChannels = playlist.playlist_channels.filter((c: any) => isChannelActiveNow(c));
    const normalChannels = activeChannels.filter((c: any) => !c.is_fallback);
    const fallbackChannels = activeChannels.filter((c: any) => c.is_fallback);

    if (normalChannels.length > 0) {
        return normalChannels.sort((a: any, b: any) => a.position - b.position)[0];
    }

    if (fallbackChannels.length > 0) {
        return fallbackChannels.sort((a: any, b: any) => a.position - b.position)[0];
    }

    return null;
}

function hasActiveContent(playlist: any): boolean {
    if (playlist.has_channels) {
        return getActiveChannel(playlist) !== null;
    }
    return playlist.playlist_items && playlist.playlist_items.length > 0;
}

async function debugSync(deviceCode: string) {
  console.log(`\n--- Debugging Sync for Device: ${deviceCode} ---`);

  // 1. Test get_public_device_info
  console.log("\n[1] Calling RPC 'get_public_device_info'...");
  const { data: deviceData, error: deviceError } = await supabase.rpc('get_public_device_info', { p_device_code: deviceCode });

  if (deviceError) {
    console.error("Error fetching device info:", deviceError);
    return;
  }

  if (!deviceData || deviceData.length === 0) {
    console.error("Device not found via RPC.");
    return;
  }

  const device = deviceData[0];
  console.log("Device found:", {
    id: device.id,
    name: device.name,
    current_playlist_id: device.current_playlist_id
  });

  // 2. Fetch Group Channels
  let relevantPlaylistIds: string[] = [];
  let relevantChannelIds: string[] = [];

  if (device.current_playlist_id) {
    relevantPlaylistIds.push(device.current_playlist_id);
  }

  console.log("\n[2] Checking Group Memberships...");
  const { data: groupMembers, error: groupError } = await supabase
    .from("device_group_members")
    .select("group_id")
    .eq("device_id", device.id);

  if (groupMembers && groupMembers.length > 0) {
    const groupIds = groupMembers.map(g => g.group_id);
    const { data: groupChannels, error: channelsError } = await supabase
    .from("device_group_channels")
    .select("distribution_channel_id")
    .in("group_id", groupIds);

    if (groupChannels) {
        relevantChannelIds = groupChannels.map(c => c.distribution_channel_id);
        console.log("Found channels from groups:", relevantChannelIds);
    }
  }

  // 3. Test get_public_playlists_data
  console.log("\n[3] Calling RPC 'get_public_playlists_data'...");
  
  const { data: playlistData, error: playlistError } = await supabase.rpc('get_public_playlists_data', {
    p_playlist_ids: relevantPlaylistIds.length > 0 ? relevantPlaylistIds : null,
    p_channel_ids: relevantChannelIds.length > 0 ? relevantChannelIds : null
  });

  if (playlistError) {
    console.error("Error fetching playlists:", playlistError);
    return;
  }

  if (!playlistData || playlistData.length === 0) {
    console.warn("No playlists returned.");
  } else {
    console.log(`Returned ${playlistData.length} playlists.`);
    
    // 4. Simulate Scheduler
    console.log("\n[4] Simulating Content Scheduler...");
    
    // Sort playlists by priority (descending) - assuming priority field exists, defaulting to 0
    const sortedPlaylists = [...playlistData].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    let activePlaylist = null;

    for (const p of sortedPlaylists) {
        console.log(`\nChecking Playlist: ${p.name}`);
        
        const isPActive = isPlaylistActiveNow(p);
        console.log(`  Playlist Schedule Active? ${isPActive}`);

        if (isPActive) {
             const hasContent = hasActiveContent(p);
             console.log(`  Has Active Content? ${hasContent}`);
             
             if (hasContent) {
                 console.log(`  >>> SELECTED PLAYLIST: ${p.name}`);
                 activePlaylist = p;
                 break; // Found the highest priority active playlist with content
             } else {
                 console.log(`  SKIPPING: Playlist is active but has no content.`);
             }
        }
    }

    if (!activePlaylist) {
        console.log("\nNO ACTIVE PLAYLIST FOUND.");
    } else {
        console.log(`\nFinal Active Items for ${activePlaylist.name}:`);
        if (activePlaylist.has_channels) {
            const channel = getActiveChannel(activePlaylist);
            console.log(`  Channel: ${channel.name}`);
            console.log(`  Items: ${channel.playlist_channel_items?.length}`);
        } else {
            console.log(`  Items: ${activePlaylist.playlist_items?.length}`);
        }
    }
  }
}

debugSync('MHXRJF38');
