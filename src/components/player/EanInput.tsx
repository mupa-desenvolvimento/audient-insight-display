import { useState, useRef, useEffect, useCallback } from "react";
import { Barcode, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EanInputProps {
  onSubmit: (ean: string) => void;
  isVisible: boolean;
  disabled?: boolean;
  onFocus?: () => void;
}

export const EanInput = ({ onSubmit, isVisible, disabled, onFocus }: EanInputProps) => {
  const [value, setValue] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Foca no input invisível quando as mídias estão visíveis
  useEffect(() => {
    if (isVisible && !disabled && hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  }, [isVisible, disabled]);

  // Refoca periodicamente quando idle
  useEffect(() => {
    if (!isVisible || disabled) return;

    const interval = setInterval(() => {
      if (hiddenInputRef.current && document.activeElement !== hiddenInputRef.current) {
        hiddenInputRef.current.focus();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, disabled]);

  const handleSubmit = useCallback((eanValue: string) => {
    const trimmed = eanValue.trim();
    if (!trimmed) return;

    // Validações básicas
    if (!/^\d+$/.test(trimmed)) {
      console.log("[EanInput] EAN inválido (não numérico):", trimmed);
      return;
    }

    const validLengths = [8, 12, 13, 14];
    if (!validLengths.includes(trimmed.length)) {
      console.log("[EanInput] EAN com tamanho inválido:", trimmed.length);
      return;
    }

    console.log("[EanInput] EAN válido, submetendo:", trimmed);
    onSubmit(trimmed);
    setValue("");
    setShowManualInput(false);
  }, [onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit(value);
    }
    if (e.key === "Escape") {
      setValue("");
      setShowManualInput(false);
    }
  };

  const handleHiddenInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Se o leitor de código de barras inserir rapidamente (scanner)
    // geralmente termina com Enter, mas alguns modelos só inserem os dígitos
    // Então verificamos se o tamanho é válido para código de barras
    const validLengths = [8, 12, 13, 14];
    if (validLengths.includes(newValue.length) && /^\d+$/.test(newValue)) {
      // Pequeno delay para permitir mais dígitos caso o scanner seja lento
      setTimeout(() => {
        if (newValue === e.target.value) {
          handleSubmit(newValue);
        }
      }, 100);
    }
  };

  const handleFocus = () => {
    onFocus?.();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Input invisível para leitor de código de barras */}
      <input
        ref={hiddenInputRef}
        type="text"
        value={value}
        onChange={handleHiddenInput}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        disabled={disabled}
        className="absolute opacity-0 w-0 h-0 pointer-events-auto"
        aria-label="Scanner de código de barras"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {/* Indicador de scanner ativo */}
      <div
        className={cn(
          "absolute bottom-6 left-1/2 -translate-x-1/2 transition-all duration-300",
          showManualInput ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
      >
        <button
          onClick={() => setShowManualInput(true)}
          className="flex items-center gap-3 px-6 py-3 bg-black/60 backdrop-blur-sm rounded-full text-white/80 hover:text-white hover:bg-black/70 transition-colors"
        >
          <Barcode className="w-5 h-5 animate-pulse" />
          <span className="text-sm">Leia ou digite o código de barras</span>
        </button>
      </div>

      {/* Input manual visível */}
      {showManualInput && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-sm rounded-xl p-2 shadow-2xl">
          <div className="relative">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
              onKeyDown={handleKeyDown}
              placeholder="Digite o EAN"
              className="w-64 pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-primary"
              autoFocus
              maxLength={14}
            />
          </div>
          
          <button
            onClick={() => handleSubmit(value)}
            disabled={!value.trim()}
            className="p-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => {
              setValue("");
              setShowManualInput(false);
              hiddenInputRef.current?.focus();
            }}
            className="p-3 bg-white/10 text-white/60 rounded-lg hover:bg-white/20 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
};
