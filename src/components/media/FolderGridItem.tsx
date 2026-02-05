import { useDroppable } from "@dnd-kit/core";
import { Folder } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Folder as FolderType } from "@/hooks/useFolders";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderGridItemProps {
  folder: FolderType;
  onClick: () => void;
  onDelete: (id: string) => void;
}

export const FolderGridItem = ({ folder, onClick, onDelete }: FolderGridItemProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id: folder.id,
    data: {
      type: 'folder',
      folder
    }
  });

  return (
    <Card 
      ref={setNodeRef}
      className={cn(
        "cursor-pointer hover:bg-accent/50 transition-colors relative group", 
        isOver && "ring-2 ring-primary bg-accent"
      )}
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center justify-center p-6 h-[200px] gap-4">
        <Folder className={cn("w-16 h-16 text-muted-foreground/50 fill-muted-foreground/20", isOver && "text-primary fill-primary/20")} />
        <span className="font-medium text-center truncate w-full px-2">{folder.name}</span>
      </CardContent>

      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
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
