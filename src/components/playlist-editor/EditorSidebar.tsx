import { 
  Image, 
  Settings, 
  Type, 
  Sparkles, 
  Music,
  Layers,
  Sticker
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorSidebarProps {
  activePanel: "media" | "settings" | null;
  onPanelChange: (panel: "media" | "settings" | null) => void;
}

const tools = [
  { id: "media" as const, icon: Image, label: "Mídia" },
  { id: "settings" as const, icon: Settings, label: "Config" },
];

const additionalTools = [
  { icon: Type, label: "Texto", disabled: true },
  { icon: Sticker, label: "Elementos", disabled: true },
  { icon: Sparkles, label: "Efeitos", disabled: true },
  { icon: Music, label: "Áudio", disabled: true },
  { icon: Layers, label: "Camadas", disabled: true },
];

export const EditorSidebar = ({ activePanel, onPanelChange }: EditorSidebarProps) => {
  return (
    <aside className="w-16 flex flex-col items-center py-3 bg-[#18181b] border-r border-white/10">
      {/* Main Tools */}
      <div className="flex flex-col gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onPanelChange(activePanel === tool.id ? null : tool.id)}
            className={cn(
              "w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-lg transition-all",
              activePanel === tool.id
                ? "bg-primary/20 text-primary"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            <tool.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="w-8 h-px bg-white/10 my-3" />

      {/* Additional Tools (disabled for now) */}
      <div className="flex flex-col gap-1">
        {additionalTools.map((tool, index) => (
          <button
            key={index}
            disabled={tool.disabled}
            className={cn(
              "w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-lg transition-all",
              tool.disabled
                ? "text-white/20 cursor-not-allowed"
                : "text-white/60 hover:text-white hover:bg-white/10"
            )}
          >
            <tool.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tool.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};
