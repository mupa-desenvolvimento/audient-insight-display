import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  RefreshCw, 
  Monitor,
  Undo2,
  Redo2,
  Download,
  MoreHorizontal,
  Check,
  Circle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface EditorHeaderProps {
  projectName: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isUpdatingDevices: boolean;
  connectedDevicesCount: number;
  onBack: () => void;
  onSave: () => void;
  onUpdateDevices: () => void;
}

export const EditorHeader = ({
  projectName,
  hasUnsavedChanges,
  isSaving,
  isUpdatingDevices,
  connectedDevicesCount,
  onBack,
  onSave,
  onUpdateDevices,
}: EditorHeaderProps) => {
  return (
    <header className="h-14 flex items-center justify-between px-4 bg-[#18181b] border-b border-white/10">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-9 w-9 text-white/70 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="flex items-center gap-2">
          <h1 className="text-sm font-medium text-white truncate max-w-[200px]">
            {projectName}
          </h1>
          <div className="flex items-center gap-1.5 text-xs">
            {hasUnsavedChanges ? (
              <span className="flex items-center gap-1 text-amber-400">
                <Circle className="w-2 h-2 fill-current" />
                Editando
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check className="w-3 h-3" />
                Salvo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center Section - Quick Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
          disabled
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
          disabled
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Connected Devices */}
        {connectedDevicesCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-white/70 hover:text-white hover:bg-white/10 gap-2"
            onClick={onUpdateDevices}
            disabled={isUpdatingDevices}
          >
            {isUpdatingDevices ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <Monitor className="w-4 h-4" />
            <span className="text-xs">{connectedDevicesCount}</span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#27272a] border-white/10">
            <DropdownMenuItem className="text-white/70 hover:text-white focus:text-white focus:bg-white/10">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem 
              className="text-white/70 hover:text-white focus:text-white focus:bg-white/10"
              onClick={onUpdateDevices}
              disabled={connectedDevicesCount === 0}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronizar Dispositivos
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          onClick={onSave}
          disabled={isSaving}
          size="sm"
          className="h-8 bg-primary hover:bg-primary/90 text-white gap-2"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar
        </Button>
      </div>
    </header>
  );
};
