import { Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorSidebarProps {
  activePanel: "media" | null;
  onPanelChange: (panel: "media" | null) => void;
}

export const EditorSidebar = ({ activePanel, onPanelChange }: EditorSidebarProps) => {
  return (
    <aside className="w-16 flex flex-col items-center py-3 bg-muted/50 border-r border-border">
      <div className="flex flex-col gap-1">
        <button
          onClick={() => onPanelChange(activePanel === "media" ? null : "media")}
          className={cn(
            "w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-lg transition-all",
            activePanel === "media"
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          <Image className="w-5 h-5" />
          <span className="text-[10px] font-medium">Mídia</span>
        </button>
      </div>
    </aside>
  );
};
