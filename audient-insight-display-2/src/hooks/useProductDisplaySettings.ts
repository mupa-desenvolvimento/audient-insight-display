import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductDisplaySettings {
  id: string;
  company_id: string;
  layout_preset: number;
  title_font_size: number;
  subtitle_font_size: number;
  price_font_size: number;
  original_price_font_size: number;
  image_position: "left" | "right";
  price_position: "top" | "center" | "bottom";
  remove_image_background: boolean;
  image_background_color: string;
  enable_color_extraction: boolean;
  container_primary_color: string;
  container_secondary_color: string;
  accent_color: string;
  created_at: string;
  updated_at: string;
}

export const defaultSettings: Omit<ProductDisplaySettings, "id" | "company_id" | "created_at" | "updated_at"> = {
  layout_preset: 1,
  title_font_size: 48,
  subtitle_font_size: 24,
  price_font_size: 96,
  original_price_font_size: 36,
  image_position: "right",
  price_position: "bottom",
  remove_image_background: false,
  image_background_color: "#FFFFFF",
  enable_color_extraction: true,
  container_primary_color: "#1E3A5F",
  container_secondary_color: "#2D4A6F",
  accent_color: "#3B82F6",
};

// Preset configurations
export const layoutPresets = [
  {
    id: 1,
    name: "Clássico",
    description: "Layout padrão com imagem à direita",
    settings: {
      image_position: "right" as const,
      price_position: "bottom" as const,
      title_font_size: 48,
      subtitle_font_size: 24,
      price_font_size: 96,
    },
  },
  {
    id: 2,
    name: "Destaque no Preço",
    description: "Preço maior e centralizado",
    settings: {
      image_position: "right" as const,
      price_position: "center" as const,
      title_font_size: 40,
      subtitle_font_size: 20,
      price_font_size: 120,
    },
  },
  {
    id: 3,
    name: "Imagem Esquerda",
    description: "Imagem à esquerda, informações à direita",
    settings: {
      image_position: "left" as const,
      price_position: "bottom" as const,
      title_font_size: 44,
      subtitle_font_size: 22,
      price_font_size: 100,
    },
  },
];

export const useProductDisplaySettings = (companyId?: string) => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["product-display-settings", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await supabase
        .from("product_display_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (error) throw error;
      return data as ProductDisplaySettings | null;
    },
    enabled: !!companyId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (newSettings: Partial<ProductDisplaySettings> & { company_id: string }) => {
      const { data: existing } = await supabase
        .from("product_display_settings")
        .select("id")
        .eq("company_id", newSettings.company_id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("product_display_settings")
          .update(newSettings)
          .eq("company_id", newSettings.company_id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("product_display_settings")
          .insert({ ...defaultSettings, ...newSettings })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-display-settings"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error) => {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    },
  });

  return {
    settings: settings || (companyId ? { ...defaultSettings, company_id: companyId } : null),
    isLoading,
    error,
    saveSettings: upsertMutation.mutate,
    isSaving: upsertMutation.isPending,
  };
};

// Hook to get settings by company slug (for player) with realtime updates
export const useProductDisplaySettingsBySlug = (companySlug?: string) => {
  const queryClient = useQueryClient();
  const [companyId, setCompanyId] = useState<string | null>(null);

  // First fetch company id
  useEffect(() => {
    if (!companySlug) return;
    
    const fetchCompanyId = async () => {
      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", companySlug)
        .maybeSingle();
      
      if (company) {
        setCompanyId(company.id);
      }
    };
    
    fetchCompanyId();
  }, [companySlug]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`product-display-settings-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_display_settings',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('Product display settings changed:', payload);
          // Invalidate query to refetch
          queryClient.invalidateQueries({ 
            queryKey: ["product-display-settings-by-slug", companySlug] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, companySlug, queryClient]);

  return useQuery({
    queryKey: ["product-display-settings-by-slug", companySlug],
    queryFn: async () => {
      if (!companySlug) return null;

      // First get company id by slug
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .select("id")
        .eq("slug", companySlug)
        .maybeSingle();

      if (companyError || !company) return null;

      const { data, error } = await supabase
        .from("product_display_settings")
        .select("*")
        .eq("company_id", company.id)
        .maybeSingle();

      if (error) return { ...defaultSettings, company_id: company.id };
      return (data as ProductDisplaySettings) || { ...defaultSettings, company_id: company.id };
    },
    enabled: !!companySlug,
  });
};

// Hook to get settings by company id (for player) with realtime updates
export const useProductDisplaySettingsRealtime = (companyId?: string) => {
  const queryClient = useQueryClient();

  // Subscribe to realtime updates
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel(`product-display-settings-realtime-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_display_settings',
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log('Product display settings changed (realtime):', payload);
          // Invalidate query to refetch
          queryClient.invalidateQueries({ 
            queryKey: ["product-display-settings-realtime", companyId] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  return useQuery({
    queryKey: ["product-display-settings-realtime", companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from("product_display_settings")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (error) return { ...defaultSettings, company_id: companyId };
      return (data as ProductDisplaySettings) || { ...defaultSettings, company_id: companyId };
    },
    enabled: !!companyId,
  });
};
