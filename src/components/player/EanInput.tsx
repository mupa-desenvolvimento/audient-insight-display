import { useState, useRef, useEffect, useCallback } from "react";
import { Barcode, Search, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

const RESET_CODE = "050223";

interface EanInputProps {
  onSubmit: (ean: string) => void;
  isVisible: boolean;
  disabled?: boolean;
  onFocus?: () => void;
  onReset?: () => void;
}

export const EanInput = ({ onSubmit, isVisible, disabled, onFocus, onReset }: EanInputProps) => {
  const [value, setValue] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
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

    // Verifica código secreto de reset
    if (trimmed === RESET_CODE) {
      console.log("[EanInput] Código de reset detectado");
      setShowResetConfirm(true);
      setValue("");
      return;
    }

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

    // Verifica código de reset
    if (newValue === RESET_CODE) {
      handleSubmit(newValue);
      return;
    }

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

  const handleConfirmReset = () => {
    console.log("[EanInput] Reset confirmado");
    setShowResetConfirm(false);
    onReset?.();
  };

  const handleCancelReset = () => {
    setShowResetConfirm(false);
    hiddenInputRef.current?.focus();
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
        disabled={disabled || showResetConfirm}
        className="absolute opacity-0 w-0 h-0 pointer-events-auto"
        aria-label="Scanner de código de barras"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {/* Modal de confirmação de reset */}
      {showResetConfirm && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-8 max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Resetar Dispositivo?</h2>
            <p className="text-muted-foreground mb-6">
              Isso apagará todos os dados locais do aplicativo, incluindo cache de mídias e configurações.
              O dispositivo precisará ser reconfigurado.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleCancelReset}
                className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
              >
                Confirmar Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de scanner ativo */}
      <div
        className={cn(
          "absolute bottom-6 left-1/2 -translate-x-1/2 transition-all duration-300",
          showManualInput || showResetConfirm ? "opacity-0 pointer-events-none" : "opacity-100"
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
      {showManualInput && !showResetConfirm && (
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
