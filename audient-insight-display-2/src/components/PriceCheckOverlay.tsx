import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '@/modules/product-service';
import { Loader2, X, Package } from 'lucide-react';

interface PriceCheckOverlayProps {
  product: Product | null;
  isLoading: boolean;
  onClose: () => void;
  error?: string | null;
}

export const PriceCheckOverlay: React.FC<PriceCheckOverlayProps> = ({ 
  product, 
  isLoading, 
  onClose,
  error
}) => {
  // Auto-close after 10 seconds if product is shown or error
  useEffect(() => {
    if ((product || error) && !isLoading) {
      const timer = setTimeout(() => {
        onClose();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [product, error, isLoading, onClose]);

  if (!product && !isLoading && !error) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-white/10"
          onClick={e => e.stopPropagation()}
        >
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-20 h-20 text-primary animate-spin mb-8" />
              <h2 className="text-3xl font-semibold animate-pulse">Consultando Preço...</h2>
            </div>
          ) : error ? (
            <div className="p-20 flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-8">
                <X className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Produto não encontrado</h2>
              <p className="text-xl text-muted-foreground">{error}</p>
            </div>
          ) : product && (
            <div className="flex flex-col md:flex-row h-full min-h-[400px]">
              {/* Image Section */}
              <div className="md:w-1/2 bg-white p-10 flex items-center justify-center border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800">
                {product.imagem_url ? (
                  <img 
                    src={product.imagem_url} 
                    alt={product.descricao}
                    className="max-h-80 object-contain drop-shadow-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                {/* Fallback Icon */}
                <div className={`hidden flex-col items-center justify-center text-zinc-300 ${!product.imagem_url ? '!flex' : ''}`}>
                  <Package className="w-32 h-32 mb-4" />
                  <span className="text-sm">Sem imagem</span>
                </div>
              </div>
              
              {/* Info Section */}
              <div className="md:w-1/2 p-10 flex flex-col justify-center bg-zinc-50 dark:bg-zinc-900/50 relative">
                <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-bold uppercase tracking-wider mb-6 w-fit">
                  {product.categoria || 'Diversos'}
                </span>
                
                <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-8 text-foreground">
                  {product.descricao}
                </h2>
                
                <div className="mt-auto">
                  <p className="text-base text-muted-foreground mb-1 font-medium uppercase tracking-wide">Preço Unitário</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-medium text-muted-foreground">R$</span>
                    <span className="text-7xl font-bold text-primary tracking-tight">
                      {product.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* AI Recommendation / Related Products Placeholder */}
                <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    Recomendação IA
                  </p>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex-shrink-0 w-24 h-24 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center opacity-50 grayscale hover:grayscale-0 transition-all cursor-pointer">
                        <Package className="w-8 h-8 text-zinc-400" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-3 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
