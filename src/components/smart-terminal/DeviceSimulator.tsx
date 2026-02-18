import { cn } from "@/lib/utils";
import { Wifi, WifiOff, ScanFace, ShoppingCart, Moon, Gift, Monitor } from "lucide-react";

export type SimulationMode = "connected" | "offline" | "recognizing" | "product_lookup" | "idle" | "personalized_offer";

interface DeviceSimulatorProps {
  mode: SimulationMode;
  visible: boolean;
}

const modeConfig: Record<SimulationMode, { icon: typeof Monitor; label: string; color: string; bgColor: string }> = {
  connected: { icon: Wifi, label: "Conectado", color: "text-green-400", bgColor: "bg-green-400/10" },
  offline: { icon: WifiOff, label: "Offline", color: "text-yellow-400", bgColor: "bg-yellow-400/10" },
  recognizing: { icon: ScanFace, label: "Reconhecendo", color: "text-purple-400", bgColor: "bg-purple-400/10" },
  product_lookup: { icon: ShoppingCart, label: "Consultando", color: "text-blue-400", bgColor: "bg-blue-400/10" },
  idle: { icon: Moon, label: "Idle", color: "text-gray-400", bgColor: "bg-gray-400/10" },
  personalized_offer: { icon: Gift, label: "Oferta Pessoal", color: "text-pink-400", bgColor: "bg-pink-400/10" },
};

export const DeviceSimulator = ({ mode, visible }: DeviceSimulatorProps) => {
  if (!visible) return null;

  const config = modeConfig[mode];
  const Icon = config.icon;

  return (
    <div className={cn(
      "absolute top-4 left-4 z-20 flex items-center gap-2 rounded-full px-3 py-1.5 backdrop-blur-sm border transition-all",
      config.bgColor,
      `border-${config.color.replace("text-", "")}/20`
    )}>
      <Icon className={cn("w-3.5 h-3.5", config.color)} />
      <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
    </div>
  );
};
