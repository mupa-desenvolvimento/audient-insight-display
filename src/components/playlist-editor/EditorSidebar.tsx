import { Image, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorSidebarProps {
  activePanel: "media" | "settings" | null;
  onPanelChange: (panel: "media" | "settings" | null) => void;
}

const tools = [
  { id: "media" as const, icon: Image, label: "Mídia" },
  { id: "settings" as const, icon: Settings, label: "Config" },
];

export const EditorSidebar = ({ activePanel, onPanelChange }: EditorSidebarProps) => {
  return (
    <aside className="w-16 flex flex-col items-center py-3 bg-muted/50 border-r border-border">
      <div className="flex flex-col gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onPanelChange(activePanel === tool.id ? null : tool.id)}
            className={cn(
              "w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-lg transition-all",
              activePanel === tool.id
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
