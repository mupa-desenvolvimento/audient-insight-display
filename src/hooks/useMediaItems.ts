import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface MediaItem {
  id: string;
  name: string;
  type: string;
  file_url: string | null;
  thumbnail_url: string | null;
  file_size: number | null;
  duration: number | null;
  resolution: string | null;
  status: string;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

export interface MediaItemInsert {
  name: string;
  type?: string;
  file_url?: string | null;
  thumbnail_url?: string | null;
  file_size?: number | null;
  duration?: number | null;
  resolution?: string | null;
  status?: string;
  metadata?: Json | null;
}

export const useMediaItems = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mediaItems = [], isLoading, error } = useQuery({
    queryKey: ["media-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MediaItem[];
    },
  });

  const createMediaItem = useMutation({
    mutationFn: async (item: MediaItemInsert) => {
      const { data, error } = await supabase
        .from("media_items")
        .insert([item])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-items"] });
      toast({ title: "Mídia criada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar mídia", description: error.message, variant: "destructive" });
    },
  });

  const updateMediaItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MediaItemInsert> & { id: string }) => {
      const { data, error } = await supabase
        .from("media_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-items"] });
      toast({ title: "Mídia atualizada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar mídia", description: error.message, variant: "destructive" });
    },
  });

  const deleteMediaItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("media_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-items"] });
      toast({ title: "Mídia excluída com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir mídia", description: error.message, variant: "destructive" });
    },
  });

  return {
    mediaItems,
    isLoading,
    error,
    createMediaItem,
    updateMediaItem,
    deleteMediaItem,
  };
};
