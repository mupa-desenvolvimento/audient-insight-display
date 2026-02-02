import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProductData {
  ean: string;
  name: string;
  unit: string;
  current_price: number;
  original_price: number | null;
  is_offer: boolean;
  savings_percent: number | null;
  image_url: string | null;
  store_code: string;
}

interface ProductLookupState {
  product: ProductData | null;
  isLoading: boolean;
  error: string | null;
}

interface UseProductLookupOptions {
  deviceCode: string;
  onLookupStart?: () => void;
  onLookupEnd?: () => void;
}

export const useProductLookup = ({ deviceCode, onLookupStart, onLookupEnd }: UseProductLookupOptions) => {
  const [state, setState] = useState<ProductLookupState>({
    product: null,
    isLoading: false,
    error: null
  });

  const lookupProduct = useCallback(async (ean: string) => {
    if (!deviceCode) {
      console.error("[useProductLookup] deviceCode não definido");
      setState({ product: null, isLoading: false, error: "Dispositivo não configurado" });
      return;
    }

    console.log("[useProductLookup] Iniciando consulta para EAN:", ean);
    
    setState({ product: null, isLoading: true, error: null });
    onLookupStart?.();

    try {
      const { data, error } = await supabase.functions.invoke("product-lookup", {
        body: { device_code: deviceCode, ean }
      });

      if (error) {
        console.error("[useProductLookup] Erro na chamada:", error);
        setState({ 
          product: null, 
          isLoading: false, 
          error: "Erro ao consultar produto. Tente novamente." 
        });
        onLookupEnd?.();
        return;
      }

      if (!data.success) {
        console.log("[useProductLookup] Produto não encontrado:", data.error);
        setState({ 
          product: null, 
          isLoading: false, 
          error: data.error || "Produto não encontrado" 
        });
        onLookupEnd?.();
        return;
      }

      console.log("[useProductLookup] Produto encontrado:", data.product);
      setState({ 
        product: data.product, 
        isLoading: false, 
        error: null 
      });
      onLookupEnd?.();
    } catch (err) {
      console.error("[useProductLookup] Erro inesperado:", err);
      setState({ 
        product: null, 
        isLoading: false, 
        error: "Erro de conexão. Verifique a rede." 
      });
      onLookupEnd?.();
    }
  }, [deviceCode, onLookupStart, onLookupEnd]);

  const clearProduct = useCallback(() => {
    setState({ product: null, isLoading: false, error: null });
  }, []);

  return {
    ...state,
    lookupProduct,
    clearProduct
  };
};
