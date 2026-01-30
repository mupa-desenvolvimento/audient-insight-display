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

// Helper to convert R2 signed URL to public URL
const getPublicUrl = (url: string | null): string | null => {
  if (!url) return null;
  
  // If already a public URL (pub-*.r2.dev), return as is
  if (url.includes('.r2.dev/')) return url;
  
  // Convert R2 storage URL to public URL format
  // From: https://{account_id}.r2.cloudflarestorage.com/{bucket}/{key}
  // To: https://{public_domain}/{key}
  const r2Match = url.match(/https:\/\/[^/]+\.r2\.cloudflarestorage\.com\/[^/]+\/(.+)/);
  if (r2Match) {
    // Hardcoded public domain for this project
    const publicDomain = 'https://pub-0e15cc358ba84ff2a24226b12278433b.r2.dev';
    return `${publicDomain}/${r2Match[1]}`;
  }
  
  return url;
};

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
      
      // Transform URLs to public format
      return (data as MediaItem[]).map(item => ({
        ...item,
        file_url: getPublicUrl(item.file_url),
        thumbnail_url: getPublicUrl(item.thumbnail_url),
      }));
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
      // Call edge function to delete from R2 and database
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Não autenticado");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-media`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mediaId: id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao excluir mídia');
      }

      return result;
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
