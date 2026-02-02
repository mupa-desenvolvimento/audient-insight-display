import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface Device {
  id: string;
  device_code: string;
  name: string;
  store_id: string | null;
  company_id: string | null;
  display_profile_id: string | null;
  current_playlist_id: string | null;
  status: string;
  last_seen_at: string | null;
  resolution: string | null;
  camera_enabled: boolean;
  metadata: Json | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeviceWithRelations extends Device {
  store?: { id: string; name: string; code: string } | null;
  company?: { id: string; name: string; slug: string } | null;
  display_profile?: { id: string; name: string; resolution: string } | null;
  current_playlist?: { id: string; name: string } | null;
}

export interface DeviceInsert {
  device_code: string;
  name: string;
  store_id?: string | null;
  company_id?: string | null;
  display_profile_id?: string | null;
  current_playlist_id?: string | null;
  status?: string;
  resolution?: string | null;
  camera_enabled?: boolean;
  metadata?: Json | null;
}

export interface DeviceUpdate {
  name?: string;
  store_id?: string | null;
  company_id?: string | null;
  display_profile_id?: string | null;
  current_playlist_id?: string | null;
  status?: string;
  resolution?: string | null;
  camera_enabled?: boolean;
  metadata?: Json | null;
  is_active?: boolean;
}

export const useDevices = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: devices = [], isLoading, error } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select(`
          *,
          store:stores(id, name, code),
          company:companies(id, name, slug),
          display_profile:display_profiles(id, name, resolution),
          current_playlist:playlists(id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DeviceWithRelations[];
    },
  });

  const createDevice = useMutation({
    mutationFn: async (device: DeviceInsert) => {
      const { data, error } = await supabase
        .from("devices")
        .insert([device])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Dispositivo criado com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar dispositivo", description: error.message, variant: "destructive" });
    },
  });

  const updateDevice = useMutation({
    mutationFn: async ({ id, ...updates }: DeviceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("devices")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Dispositivo atualizado com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar dispositivo", description: error.message, variant: "destructive" });
    },
  });

  const deleteDevice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      toast({ title: "Dispositivo excluído com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir dispositivo", description: error.message, variant: "destructive" });
    },
  });

  return {
    devices,
    isLoading,
    error,
    createDevice,
    updateDevice,
    deleteDevice,
  };
};
