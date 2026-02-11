import { useDroppable } from "@dnd-kit/core";
import { Folder, FolderInput, Check, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Folder as FolderType } from "@/hooks/useFolders";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface FolderGridItemProps {
  folder: FolderType;
  onClick: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onUpload?: (id: string) => void;
}

export const FolderGridItem = ({ folder, onClick, onDelete, onRename, onUpload }: FolderGridItemProps) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isOver, setNodeRef } = useDroppable({
    id: folder.id,
    data: {
      type: 'folder',
      folder
    }
  });

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleRenameSubmit = () => {
    if (newName.trim() && newName !== folder.name) {
      onRename(folder.id, newName.trim());
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setNewName(folder.name);
    }
  };

  return (
    <Card 
      ref={setNodeRef}
      className={cn(
        "cursor-pointer transition-all duration-300 relative group overflow-hidden border-border/50 hover:border-primary/50",
        "bg-gradient-to-br from-card to-card/50 hover:to-accent/10",
        "shadow-sm hover:shadow-md",
        isOver && "ring-2 ring-primary bg-primary/5 scale-[1.02] shadow-xl ring-offset-2"
      )}
      onClick={!isRenaming ? onClick : undefined}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 h-[180px] gap-4">
        <div className={cn(
          "w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300",
          isOver ? "bg-primary/20 text-primary scale-110" : "bg-primary/5 text-primary/40 group-hover:text-primary/60 group-hover:bg-primary/10 group-hover:scale-105"
        )}>
          {isOver ? (
            <FolderInput className="w-10 h-10 animate-pulse" />
          ) : (
            <Folder className="w-10 h-10 fill-current" />
          )}
        </div>

        {isRenaming ? (
          <div className="flex items-center gap-1 w-full animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <Input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleRenameSubmit}
              className="h-8 text-center text-sm px-2 bg-background/80 backdrop-blur-sm"
            />
            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={handleRenameSubmit}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={(e) => {
              e.stopPropagation();
              setIsRenaming(false);
              setNewName(folder.name);
            }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <span className="font-medium text-sm text-center truncate w-full px-2 text-foreground/80 group-hover:text-foreground transition-colors">
            {folder.name}
          </span>
        )}
        
        {isOver && (
          <div className="absolute inset-0 bg-primary/5 flex items-end justify-center pb-4 animate-in fade-in duration-200">
            <span className="text-xs text-primary font-semibold bg-background/80 px-3 py-1 rounded-full shadow-sm backdrop-blur-sm">
              Soltar itens aqui
            </span>
          </div>
        )}
      </CardContent>

      <div className={cn(
        "absolute top-2 right-2 transition-all duration-200",
        isRenaming ? "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100"
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/50 backdrop-blur-sm hover:bg-background/80 shadow-sm rounded-full">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onUpload && (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onUpload(folder.id);
              }}>
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              setIsRenaming(true);
            }}>
              <Pencil className="w-4 h-4 mr-2" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-red-600 focus:text-red-600"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(folder.id);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
};
