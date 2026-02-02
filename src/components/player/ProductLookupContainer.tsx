import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, Tag, ArrowLeft, Package, Loader2 } from "lucide-react";

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

interface ProductLookupContainerProps {
  product: ProductData | null;
  isLoading: boolean;
  error: string | null;
  onDismiss: () => void;
  timeout?: number; // em segundos
}

export const ProductLookupContainer = ({
  product,
  isLoading,
  error,
  onDismiss,
  timeout = 15
}: ProductLookupContainerProps) => {
  const [countdown, setCountdown] = useState(timeout);
  const [imageError, setImageError] = useState(false);

  // Countdown para retorno automático
  useEffect(() => {
    if (isLoading) {
      setCountdown(timeout);
      return;
    }

    if (!product && !error) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [product, error, isLoading, timeout, onDismiss]);

  // Reset countdown quando produto muda
  useEffect(() => {
    setCountdown(timeout);
    setImageError(false);
  }, [product?.ean, timeout]);

  // Formatar preço
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Estado de carregamento
  if (isLoading) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-20 h-20 text-primary animate-spin mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-2">Consultando Produto...</h2>
          <p className="text-white/60 text-xl">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  // Estado de erro
  if (error) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-red-950/20 to-slate-900 flex items-center justify-center p-8">
        <div className="text-center max-w-2xl">
          <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-14 h-14 text-red-400" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Produto Não Encontrado</h2>
          <p className="text-white/70 text-xl mb-8">{error}</p>
          
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={onDismiss}
              className="flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl text-white text-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
              Voltar às Mídias
            </button>
            <p className="text-white/40 text-sm">
              Retornando automaticamente em {countdown}s
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estado de produto encontrado
  if (product) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-stretch">
        {/* Lado esquerdo - Imagem */}
        <div className="flex-1 flex items-center justify-center p-8 bg-white/5">
          {product.image_url && !imageError ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-80 h-80 bg-white/10 rounded-xl flex items-center justify-center">
              <Package className="w-32 h-32 text-white/30" />
            </div>
          )}
        </div>

        {/* Lado direito - Informações */}
        <div className="flex-1 flex flex-col justify-center p-12">
          {/* Tag de oferta */}
          {product.is_offer && (
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-full text-lg font-bold animate-pulse">
                <Tag className="w-5 h-5" />
                OFERTA
              </span>
              {product.savings_percent && (
                <span className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-full text-lg font-bold">
                  -{product.savings_percent}%
                </span>
              )}
            </div>
          )}

          {/* Nome do produto */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {product.name}
          </h1>

          {/* EAN */}
          <p className="text-white/50 text-lg mb-8 font-mono">
            EAN: {product.ean}
          </p>

          {/* Preços */}
          <div className="mb-8">
            {product.is_offer && product.original_price && (
              <div className="flex items-center gap-4 mb-2">
                <span className="text-white/50 text-2xl">De:</span>
                <span className="text-white/50 text-3xl line-through">
                  {formatPrice(product.original_price)}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-4">
              <span className={cn(
                "text-2xl",
                product.is_offer ? "text-green-400" : "text-white/50"
              )}>
                {product.is_offer ? "Por:" : "Preço:"}
              </span>
              <span className={cn(
                "font-bold",
                product.is_offer 
                  ? "text-6xl md:text-7xl text-green-400" 
                  : "text-5xl md:text-6xl text-white"
              )}>
                {formatPrice(product.current_price)}
              </span>
            </div>

            {/* Unidade */}
            <p className="text-white/40 text-xl mt-2">
              {product.unit}
            </p>
          </div>

          {/* Economia */}
          {product.is_offer && product.original_price && product.savings_percent && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6 mb-8">
              <p className="text-green-400 text-2xl font-semibold">
                🎉 Você economiza {formatPrice(product.original_price - product.current_price)}!
              </p>
            </div>
          )}

          {/* Countdown */}
          <div className="flex items-center gap-4 text-white/40">
            <button
              onClick={onDismiss}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>
            <span className="text-sm">
              Retornando em {countdown}s
            </span>
          </div>
        </div>

        {/* Barra de progresso do countdown */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-primary transition-all duration-1000 ease-linear"
            style={{ width: `${(countdown / timeout) * 100}%` }}
          />
        </div>
      </div>
    );
  }

  return null;
};
