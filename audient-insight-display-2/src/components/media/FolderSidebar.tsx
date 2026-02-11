import { useFolders, Folder as FolderType } from "@/hooks/useFolders";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";
import { ChevronDown, ChevronRight, Folder, FolderOpen, HardDrive } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

interface FolderSidebarProps {
  currentFolderId: string | null;
  onSelectFolder: (folder: FolderType | null, path: { id: string; name: string }[]) => void;
  className?: string;
}

interface FolderTreeItemProps {
  folder: FolderType;
  level: number;
  currentFolderId: string | null;
  onSelectFolder: (folder: FolderType | null, path: { id: string; name: string }[]) => void;
  subfolders: FolderType[];
  allFolders: FolderType[];
}

const getFolderPath = (folder: FolderType, allFolders: FolderType[]): { id: string; name: string }[] => {
  const path = [{ id: folder.id, name: folder.name }];
  let current = folder;
  while (current.parent_id) {
    const parent = allFolders.find((f) => f.id === current.parent_id);
    if (parent) {
      path.unshift({ id: parent.id, name: parent.name });
      current = parent;
    } else {
      break;
    }
  }
  return path;
};

const FolderTreeItem = ({
  folder,
  level,
  currentFolderId,
  onSelectFolder,
  subfolders,
  allFolders
}: FolderTreeItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { isOver, setNodeRef } = useDroppable({
    id: folder.id,
    data: { type: "folder", folder },
  });

  const isSelected = currentFolderId === folder.id;
  const hasChildren = subfolders.length > 0;

  // Auto-expand if a child is selected (simple check)
  useEffect(() => {
    // Check if any descendant is selected
    const isDescendantSelected = (folders: FolderType[], parentId: string): boolean => {
       const children = folders.filter(f => f.parent_id === parentId);
       for (const child of children) {
         if (child.id === currentFolderId) return true;
         if (isDescendantSelected(folders, child.id)) return true;
       }
       return false;
    };
    
    if (isDescendantSelected(allFolders, folder.id)) {
      setIsOpen(true);
    }
  }, [currentFolderId, allFolders, folder.id]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const path = getFolderPath(folder, allFolders);
    onSelectFolder(folder, path);
  };

  return (
    <div className="select-none">
      <div
        ref={setNodeRef}
        className={cn(
          "flex items-center py-1.5 px-2 rounded-md cursor-pointer transition-colors text-sm mb-0.5",
          isSelected ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          isOver ? "bg-primary/20 ring-1 ring-primary" : ""
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        <div
          className="p-0.5 mr-1 hover:bg-black/5 rounded"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          {hasChildren ? (
            isOpen ? (
              <ChevronDown className="h-3 w-3 opacity-70" />
            ) : (
              <ChevronRight className="h-3 w-3 opacity-70" />
            )
          ) : (
            <div className="w-3 h-3 mr-1" />
          )}
        </div>
        
        {isOpen || isSelected ? (
          <FolderOpen className={cn("h-4 w-4 mr-2", isSelected ? "text-primary fill-primary/20" : "text-amber-500 fill-amber-500/20")} />
        ) : (
          <Folder className="h-4 w-4 mr-2 text-amber-500 fill-amber-500/20" />
        )}
        <span className="truncate">{folder.name}</span>
      </div>

      {isOpen && hasChildren && (
        <div>
          {subfolders.map((child) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              level={level + 1}
              currentFolderId={currentFolderId}
              onSelectFolder={onSelectFolder}
              subfolders={allFolders.filter((f) => f.parent_id === child.id)}
              allFolders={allFolders}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FolderSidebar = ({
  currentFolderId,
  onSelectFolder,
  className,
}: FolderSidebarProps) => {
  const { folders } = useFolders(null, { fetchAll: true });
  
  // Root droppable
  const { isOver: isOverRoot, setNodeRef: setRootRef } = useDroppable({
    id: "root",
    data: { type: "folder", folder: null },
  });

  const rootFolders = folders.filter((f) => !f.parent_id);

  return (
    <div className={cn("flex flex-col h-full border-r bg-card/50", className)}>
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm text-muted-foreground mb-1">Pastas</h3>
      </div>
      
      <ScrollArea className="flex-1 py-2">
        <div className="px-3">
          {/* Root Item */}
          <div
            ref={setRootRef}
            className={cn(
              "flex items-center py-2 px-2 rounded-md cursor-pointer transition-colors text-sm mb-1",
              currentFolderId === null ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              isOverRoot ? "bg-primary/20 ring-1 ring-primary" : ""
            )}
            onClick={() => onSelectFolder(null, [])}
          >
            <div className="w-4 mr-1" /> {/* Spacer for alignment */}
            <HardDrive className="h-4 w-4 mr-2 opacity-70" />
            <span>Raiz</span>
          </div>

          {/* Folder Tree */}
          {rootFolders.map((folder) => (
            <FolderTreeItem
              key={folder.id}
              folder={folder}
              level={0}
              currentFolderId={currentFolderId}
              onSelectFolder={onSelectFolder}
              subfolders={folders.filter((f) => f.parent_id === folder.id)}
              allFolders={folders}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
