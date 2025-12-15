-- Channels table (tipos de conteúdo)
CREATE TABLE public.channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'custom', -- consulta_preco, ofertas, institucional, dicas, noticias, clima, avisos, custom
  source TEXT NOT NULL DEFAULT 'upload', -- upload, api, integration
  priority INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Playlists table
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  schedule JSONB DEFAULT '{}'::jsonb, -- scheduling rules (days, times)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Media items table
CREATE TABLE public.media_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'image', -- image, video
  file_url TEXT,
  file_size BIGINT,
  duration INTEGER DEFAULT 10, -- seconds
  resolution TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, active, scheduled, inactive
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Playlist items (junction table for media in playlists)
CREATE TABLE public.playlist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  duration_override INTEGER, -- override media duration
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Display profiles table
CREATE TABLE public.display_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  orientation TEXT NOT NULL DEFAULT 'horizontal', -- horizontal, vertical
  resolution TEXT NOT NULL DEFAULT '1920x1080',
  has_touch BOOLEAN NOT NULL DEFAULT false,
  default_layout TEXT,
  permitted_channels TEXT[] DEFAULT '{}',
  offline_behavior TEXT DEFAULT 'show_last',
  idle_behavior TEXT DEFAULT 'loop_playlist',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Devices table
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_code TEXT NOT NULL UNIQUE, -- código para auto-registro
  name TEXT NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  display_profile_id UUID REFERENCES public.display_profiles(id) ON DELETE SET NULL,
  current_playlist_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, online, offline
  last_seen_at TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  camera_enabled BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Device groups for bulk operations
CREATE TABLE public.device_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Device group membership
CREATE TABLE public.device_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.device_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(device_id, group_id)
);

-- Enable RLS
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.display_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channels (admin can manage, authenticated can read)
CREATE POLICY "Admins can manage channels" ON public.channels FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read channels" ON public.channels FOR SELECT USING (true);

-- RLS Policies for playlists
CREATE POLICY "Admins can manage playlists" ON public.playlists FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read playlists" ON public.playlists FOR SELECT USING (true);

-- RLS Policies for media_items
CREATE POLICY "Admins can manage media" ON public.media_items FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read media" ON public.media_items FOR SELECT USING (true);

-- RLS Policies for playlist_items
CREATE POLICY "Admins can manage playlist items" ON public.playlist_items FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read playlist items" ON public.playlist_items FOR SELECT USING (true);

-- RLS Policies for display_profiles
CREATE POLICY "Admins can manage display profiles" ON public.display_profiles FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read display profiles" ON public.display_profiles FOR SELECT USING (true);

-- RLS Policies for devices (based on store access)
CREATE POLICY "Admins can manage devices" ON public.devices FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users can read accessible devices" ON public.devices FOR SELECT USING (store_id IS NULL OR has_store_access(auth.uid(), store_id));

-- RLS Policies for device_groups
CREATE POLICY "Admins can manage device groups" ON public.device_groups FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Users can read accessible device groups" ON public.device_groups FOR SELECT USING (store_id IS NULL OR has_store_access(auth.uid(), store_id));

-- RLS Policies for device_group_members
CREATE POLICY "Admins can manage group members" ON public.device_group_members FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Authenticated can read group members" ON public.device_group_members FOR SELECT USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON public.playlists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_media_items_updated_at BEFORE UPDATE ON public.media_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_display_profiles_updated_at BEFORE UPDATE ON public.display_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_device_groups_updated_at BEFORE UPDATE ON public.device_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();