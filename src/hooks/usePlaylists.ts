import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface Playlist {
  id: string;
  name: string;
  description: string | null;
  channel_id: string | null;
  is_active: boolean;
  schedule: Json | null;
  created_at: string;
  updated_at: string;
}

export interface PlaylistWithChannel extends Playlist {
  channel?: { id: string; name: string; type: string } | null;
  item_count?: number;
}

export interface PlaylistInsert {
  name: string;
  description?: string | null;
  channel_id?: string | null;
  is_active?: boolean;
  schedule?: Json | null;
}

export const usePlaylists = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: playlists = [], isLoading, error } = useQuery({
    queryKey: ["playlists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlists")
        .select(`
          *,
          channel:channels(id, name, type)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PlaylistWithChannel[];
    },
  });

  const createPlaylist = useMutation({
    mutationFn: async (playlist: PlaylistInsert) => {
      const { data, error } = await supabase
        .from("playlists")
        .insert([playlist])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast({ title: "Playlist criada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar playlist", description: error.message, variant: "destructive" });
    },
  });

  const updatePlaylist = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlaylistInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("playlists")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast({ title: "Playlist atualizada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar playlist", description: error.message, variant: "destructive" });
    },
  });

  const deletePlaylist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("playlists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast({ title: "Playlist excluída com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir playlist", description: error.message, variant: "destructive" });
    },
  });

  return {
    playlists,
    isLoading,
    error,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
  };
};
