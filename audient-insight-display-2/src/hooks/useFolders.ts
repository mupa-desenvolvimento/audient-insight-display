import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  user_id: string | null;
}

export interface FolderInsert {
  name: string;
  parent_id?: string | null;
}

export const useFolders = (currentFolderId: string | null = null, options?: { fetchAll?: boolean }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: folders = [], isLoading, error } = useQuery({
    queryKey: ["folders", currentFolderId, options?.fetchAll],
    queryFn: async () => {
      console.log('[useFolders] Fetching folders. Parent:', currentFolderId, 'FetchAll:', options?.fetchAll);
      let query = supabase
        .from("folders")
        .select("*")
        .order("name", { ascending: true });
      
      if (!options?.fetchAll) {
        if (currentFolderId) {
          query = query.eq("parent_id", currentFolderId);
        } else {
          query = query.is("parent_id", null);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Folder[];
    },
  });

  const createFolder = useMutation({
    mutationFn: async (folder: FolderInsert) => {
      const { data, error } = await supabase
        .from("folders")
        .insert([folder])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast({ title: "Pasta criada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar pasta", description: error.message, variant: "destructive" });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", folderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast({ title: "Pasta removida com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover pasta", description: error.message, variant: "destructive" });
    },
  });

  const renameFolder = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("folders")
        .update({ name })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folders"] });
      toast({ title: "Pasta renomeada com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao renomear pasta", description: error.message, variant: "destructive" });
    },
  });

  return {
    folders,
    isLoading,
    error,
    createFolder,
    deleteFolder,
    renameFolder
  };
};
