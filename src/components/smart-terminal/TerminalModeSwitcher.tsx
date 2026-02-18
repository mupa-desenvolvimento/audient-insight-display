import { cn } from "@/lib/utils";
import {
  Monitor,
  ShoppingCart,
  ScanFace,
  Bot,
  BarChart3,
  Heart,
  Users,
  Settings,
} from "lucide-react";

export type TerminalMode =
  | "player"
  | "product"
  | "facial"
  | "assistant"
  | "metrics"
  | "loyalty"
  | "counter"
  | "settings";

interface TerminalModeSwitcherProps {
  activeMode: TerminalMode;
  onModeChange: (mode: TerminalMode) => void;
  visible: boolean;
  peopleCount?: number;
  facesDetected?: number;
}

const modes: { id: TerminalMode; icon: typeof Monitor; label: string; color: string }[] = [
  { id: "player", icon: Monitor, label: "Player", color: "text-blue-400" },
  { id: "product", icon: ShoppingCart, label: "Consulta", color: "text-green-400" },
  { id: "facial", icon: ScanFace, label: "Facial", color: "text-purple-400" },
  { id: "loyalty", icon: Heart, label: "Fidelidade", color: "text-red-400" },
  { id: "assistant", icon: Bot, label: "Assistente", color: "text-cyan-400" },
  { id: "counter", icon: Users, label: "Contador", color: "text-yellow-400" },
  { id: "metrics", icon: BarChart3, label: "Métricas", color: "text-orange-400" },
  { id: "settings", icon: Settings, label: "Config", color: "text-gray-400" },
];

export const TerminalModeSwitcher = ({
  activeMode,
  onModeChange,
  visible,
  peopleCount,
  facesDetected,
}: TerminalModeSwitcherProps) => {
  return (
    <div
      className={cn(
        "absolute right-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1 p-1.5 bg-black/80 backdrop-blur-md rounded-l-xl border border-white/10 transition-all duration-300",
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      )}
    >
      {modes.map(({ id, icon: Icon, label, color }) => (
        <button
          key={id}
          onClick={() => onModeChange(id)}
          className={cn(
            "relative flex flex-col items-center gap-0.5 p-2 rounded-lg transition-all duration-200 min-w-[52px]",
            activeMode === id
              ? "bg-white/15 scale-105"
              : "hover:bg-white/10"
          )}
          title={label}
        >
          <Icon className={cn("w-5 h-5", activeMode === id ? color : "text-white/60")} />
          <span className={cn("text-[9px] font-medium", activeMode === id ? "text-white" : "text-white/50")}>
            {label}
          </span>
          {id === "counter" && peopleCount !== undefined && peopleCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {peopleCount > 99 ? "99+" : peopleCount}
            </span>
          )}
          {id === "facial" && facesDetected !== undefined && facesDetected > 0 && (
            <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {facesDetected}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};
