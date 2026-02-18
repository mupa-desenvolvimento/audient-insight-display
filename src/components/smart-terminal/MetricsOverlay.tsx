import { cn } from "@/lib/utils";
import { X, Eye, ShoppingCart, ScanFace, Bot, Users, Clock, TrendingUp } from "lucide-react";
import { TerminalMetrics } from "@/hooks/useTerminalMetrics";

interface MetricsOverlayProps {
  visible: boolean;
  metrics: TerminalMetrics;
  onClose: () => void;
}

export const MetricsOverlay = ({ visible, metrics, onClose }: MetricsOverlayProps) => {
  if (!visible) return null;

  const uptime = Math.floor((Date.now() - metrics.sessionStart) / 1000);
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const totalViews = Array.from(metrics.mediaViews.values()).reduce((a, b) => a + b, 0);

  const cards = [
    { icon: Eye, label: "Exibições", value: totalViews, color: "from-blue-500 to-blue-600" },
    { icon: Clock, label: "Tempo Médio", value: `${metrics.avgScreenTime.toFixed(1)}s`, color: "from-indigo-500 to-indigo-600" },
    { icon: ShoppingCart, label: "Consultas", value: metrics.productLookups, color: "from-green-500 to-green-600" },
    { icon: ScanFace, label: "Rostos", value: metrics.facesDetected, color: "from-purple-500 to-purple-600" },
    { icon: TrendingUp, label: "Taxa Reconh.", value: `${metrics.recognitionRate.toFixed(0)}%`, color: "from-pink-500 to-pink-600" },
    { icon: Bot, label: "Interações IA", value: metrics.assistantInteractions, color: "from-cyan-500 to-cyan-600" },
    { icon: Users, label: "Pessoas", value: metrics.peopleCount, color: "from-yellow-500 to-yellow-600" },
    { icon: Clock, label: "Uptime", value: `${hours}h${minutes}m`, color: "from-gray-500 to-gray-600" },
  ];

  return (
    <div className="absolute inset-0 z-40 bg-black/95 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h3 className="text-white font-semibold text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-400" />
          Métricas em Tempo Real
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3", color)}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-white/50 text-xs uppercase tracking-wider">{label}</p>
              <p className="text-white text-2xl font-bold mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Top media */}
        {metrics.mediaViews.size > 0 && (
          <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4">
            <h4 className="text-white font-medium mb-3">Top Conteúdos</h4>
            <div className="space-y-2">
              {Array.from(metrics.mediaViews.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([id, views]) => (
                  <div key={id} className="flex items-center justify-between text-sm">
                    <span className="text-white/70 truncate max-w-[200px]">{id.slice(0, 8)}...</span>
                    <span className="text-white font-medium">{views} views</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
