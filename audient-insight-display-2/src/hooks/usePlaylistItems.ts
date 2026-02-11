import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  media_id: string;
  position: number;
  duration_override: number | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  days_of_week: number[] | null;
  is_schedule_override: boolean;
  created_at: string;
  media?: {
    id: string;
    name: string;
    type: string;
    file_url: string | null;
    duration: number | null;
    file_size: number | null;
    resolution: string | null;
    status: string;
  };
}

export interface PlaylistItemInsert {
  playlist_id: string;
  media_id: string;
  position: number;
  duration_override?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  days_of_week?: number[] | null;
  is_schedule_override?: boolean;
}

export const usePlaylistItems = (playlistId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ["playlist-items", playlistId],
    queryFn: async () => {
      if (!playlistId) return [];
      
      const { data, error } = await supabase
        .from("playlist_items")
        .select(`
          *,
          media:media_items(id, name, type, file_url, duration, file_size, resolution, status)
        `)
        .eq("playlist_id", playlistId)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as PlaylistItem[];
    },
    enabled: !!playlistId,
  });

  const addItem = useMutation({
    mutationFn: async (item: PlaylistItemInsert) => {
      const { data, error } = await supabase
        .from("playlist_items")
        .insert([item])
        .select(`
          *,
          media:media_items(id, name, type, file_url, duration, file_size, resolution, status)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist-items", playlistId] });
      toast({ title: "Mídia adicionada à playlist" });
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar mídia", description: error.message, variant: "destructive" });
    },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PlaylistItemInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("playlist_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist-items", playlistId] });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar item", description: error.message, variant: "destructive" });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("playlist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist-items", playlistId] });
      toast({ title: "Mídia removida da playlist" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover mídia", description: error.message, variant: "destructive" });
    },
  });

  const reorderItems = useMutation({
    mutationFn: async (orderedItems: { id: string; position: number }[]) => {
      const promises = orderedItems.map(({ id, position }) =>
        supabase.from("playlist_items").update({ position }).eq("id", id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist-items", playlistId] });
    },
    onError: (error) => {
      toast({ title: "Erro ao reordenar itens", description: error.message, variant: "destructive" });
    },
  });

  const getTotalDuration = () => {
    return items.reduce((total, item) => {
      const duration = item.duration_override || item.media?.duration || 8;
      return total + duration;
    }, 0);
  };

  return {
    items,
    isLoading,
    error,
    addItem,
    updateItem,
    removeItem,
    reorderItems,
    getTotalDuration,
  };
};
