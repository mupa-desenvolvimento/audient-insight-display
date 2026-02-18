import { cn } from "@/lib/utils";
import { X, Settings, Palette, Monitor, Wifi, Database, Trash2, RefreshCw } from "lucide-react";

export type TerminalTheme = "supermarket" | "pharmacy" | "fashion";

interface TerminalSettingsOverlayProps {
  visible: boolean;
  theme: TerminalTheme;
  onThemeChange: (theme: TerminalTheme) => void;
  deviceCode?: string;
  isOnline?: boolean;
  onSync?: () => void;
  onReset?: () => void;
  onClose: () => void;
}

const themes: { id: TerminalTheme; name: string; colors: string; description: string }[] = [
  {
    id: "supermarket",
    name: "Supermercado",
    colors: "from-green-500 to-emerald-600",
    description: "Verde vibrante, ideal para varejo alimentar",
  },
  {
    id: "pharmacy",
    name: "Farmácia",
    colors: "from-blue-500 to-cyan-600",
    description: "Azul médico, transmite confiança e saúde",
  },
  {
    id: "fashion",
    name: "Moda",
    colors: "from-rose-500 to-pink-600",
    description: "Rosa elegante, perfeito para lojas de moda",
  },
];

export const TerminalSettingsOverlay = ({
  visible,
  theme,
  onThemeChange,
  deviceCode,
  isOnline,
  onSync,
  onReset,
  onClose,
}: TerminalSettingsOverlayProps) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-40 bg-black/95 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          Configurações do Terminal
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Device info */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <Monitor className="w-4 h-4" /> Dispositivo
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">Código</span>
              <span className="text-white font-mono">{deviceCode || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Status</span>
              <span className={cn("flex items-center gap-1", isOnline ? "text-green-400" : "text-yellow-400")}>
                <Wifi className="w-3 h-3" />
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Theme selector */}
        <div>
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4" /> Tema Visual
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => onThemeChange(t.id)}
                className={cn(
                  "rounded-xl border p-4 text-left transition-all",
                  theme === t.id
                    ? "border-primary bg-primary/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                )}
              >
                <div className={cn("w-full h-3 rounded-full bg-gradient-to-r mb-3", t.colors)} />
                <p className="text-white text-sm font-medium">{t.name}</p>
                <p className="text-white/40 text-xs mt-1">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <h4 className="text-white font-medium mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" /> Ações
          </h4>
          {onSync && (
            <button
              onClick={onSync}
              className="w-full flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-left transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white text-sm font-medium">Forçar Sincronização</p>
                <p className="text-white/40 text-xs">Baixar último conteúdo do servidor</p>
              </div>
            </button>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="w-full flex items-center gap-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl p-4 text-left transition-colors"
            >
              <Trash2 className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-red-400 text-sm font-medium">Resetar Terminal</p>
                <p className="text-white/40 text-xs">Limpar cache e voltar ao setup</p>
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
