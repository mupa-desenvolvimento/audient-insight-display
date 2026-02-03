import { Package, Tag, CheckCircle } from "lucide-react";
import { rgbToString, rgbToRgba, type ExtractedColors } from "@/lib/colorExtractor";

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

interface ProductDisplayProps {
  product: ProductData;
  colors: ExtractedColors;
  countdown: number;
  timeout: number;
  onImageLoad: () => void;
  imageLoaded: boolean;
}

export const ProductDisplay = ({
  product,
  colors,
  countdown,
  timeout,
  onImageLoad,
  imageLoaded,
}: ProductDisplayProps) => {
  // Formatar preço
  const formatPrice = (price: number) => {
    const [reais, centavos] = price.toFixed(2).split(".");
    return { reais, centavos };
  };

  const currentPrice = formatPrice(product.current_price);
  const originalPrice = product.original_price ? formatPrice(product.original_price) : null;

  // Calcular economia
  const savings = product.original_price 
    ? product.original_price - product.current_price 
    : 0;

  // Gerar gradiente de fundo baseado na cor dominante
  const leftGradient = `linear-gradient(180deg, 
    ${rgbToRgba(colors.muted, 1)} 0%, 
    ${rgbToRgba(colors.dominant, 0.9)} 50%, 
    ${rgbToRgba(colors.muted, 1)} 100%
  )`;

  // Fundo do lado da imagem - mais claro
  const rightBackground = colors.isDark 
    ? `linear-gradient(135deg, ${rgbToRgba(colors.vibrant, 0.3)} 0%, ${rgbToRgba(colors.dominant, 0.2)} 100%)`
    : `linear-gradient(135deg, ${rgbToRgba(colors.dominant, 0.15)} 0%, ${rgbToRgba(colors.muted, 0.1)} 100%)`;

  // Cores do texto baseadas na luminância
  const textColor = colors.isDark ? "text-white" : "text-slate-900";
  const textMuted = colors.isDark ? "text-white/70" : "text-slate-600";

  return (
    <div className="absolute inset-0 flex">
      {/* Lado esquerdo - Informações do produto */}
      <div 
        className="w-1/2 flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden"
        style={{ background: leftGradient }}
      >
        {/* Header com nome */}
        <div className="relative z-10">
          {/* Nome do produto */}
          <h1 className={`text-3xl lg:text-4xl xl:text-5xl font-bold ${textColor} leading-tight mb-2`}>
            {product.name}
          </h1>
          
          {/* Unidade */}
          <p className={`text-lg lg:text-xl ${textMuted}`}>
            {product.unit}
          </p>
        </div>

        {/* Tags de oferta */}
        {product.is_offer && (
          <div className="flex flex-wrap gap-2 my-4">
            <span 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white font-bold text-sm lg:text-base"
              style={{ backgroundColor: rgbToString(colors.vibrant) }}
            >
              <CheckCircle className="w-4 h-4" />
              OFERTA PREÇO DE POR
            </span>
          </div>
        )}

        {/* Bloco de preços */}
        <div className="relative z-10 my-6">
          {/* Preço original (se oferta) */}
          {product.is_offer && originalPrice && (
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-lg ${textMuted}`}>DE</span>
              <span className={`text-2xl lg:text-3xl ${textMuted} line-through`}>
                R$ {originalPrice.reais}<span className="text-lg">,{originalPrice.centavos}</span>
              </span>
            </div>
          )}
          
          {/* Preço atual */}
          <div 
            className="inline-block px-6 py-4 rounded-xl"
            style={{ 
              backgroundColor: rgbToRgba(colors.isDark ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 }, 0.3),
              backdropFilter: 'blur(8px)'
            }}
          >
            {product.is_offer && (
              <span className={`block text-sm ${textMuted} mb-1`}>POR</span>
            )}
            <div className="flex items-baseline">
              <span className={`text-2xl ${textColor} font-medium mr-1`}>R$</span>
              <span className={`text-5xl lg:text-6xl xl:text-7xl font-bold ${textColor}`}>
                {currentPrice.reais}
              </span>
              <span className={`text-2xl lg:text-3xl ${textColor} font-bold`}>
                ,{currentPrice.centavos}
              </span>
            </div>
          </div>
        </div>

        {/* Mensagem de economia */}
        {product.is_offer && savings > 0 && (
          <div 
            className="p-4 rounded-xl mb-4"
            style={{ 
              backgroundColor: rgbToRgba(colors.isDark ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }, 0.15),
              backdropFilter: 'blur(4px)'
            }}
          >
            <p className={`${textColor} text-base lg:text-lg`}>
              Produto em oferta! De <span className="font-semibold">R$ {product.original_price?.toFixed(2).replace('.', ',')}</span> por{' '}
              <span className="font-semibold">R$ {product.current_price.toFixed(2).replace('.', ',')}</span>.
              {product.savings_percent && (
                <span className="font-bold"> Economia de {product.savings_percent}%!</span>
              )}
            </p>
          </div>
        )}

        {/* Economia em destaque */}
        {product.is_offer && savings > 0 && (
          <div className="mb-4">
            <p className={`${textMuted} text-sm mb-2`}>Você economiza:</p>
            <div 
              className="inline-flex items-center px-4 py-2 rounded-lg font-bold text-white text-xl"
              style={{ backgroundColor: 'rgb(34, 197, 94)' }}
            >
              R$ {savings.toFixed(2).replace('.', ',')}
            </div>
          </div>
        )}

        {/* Código EAN e countdown */}
        <div className={`relative z-10 ${textMuted} text-sm`}>
          <p>Código: {product.ean}</p>
        </div>

        {/* Barra de progresso do countdown */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{ 
              width: `${(countdown / timeout) * 100}%`,
              backgroundColor: rgbToString(colors.vibrant)
            }}
          />
        </div>
      </div>

      {/* Lado direito - Imagem do produto */}
      <div 
        className="w-1/2 flex items-center justify-center p-8 relative"
        style={{ background: rightBackground }}
      >
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className={`max-w-[85%] max-h-[85vh] object-contain drop-shadow-2xl transition-opacity duration-500 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={onImageLoad}
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-64 h-64 bg-white/10 rounded-xl flex items-center justify-center">
            <Package className="w-24 h-24 text-white/30" />
          </div>
        )}

        {/* Indicador de countdown discreto */}
        <div className="absolute bottom-4 right-4 text-white/30 text-xs">
          {countdown}s
        </div>
      </div>
    </div>
  );
};
