 import { useDroppable } from "@dnd-kit/core";
import { Folder, FolderInput, MoreVertical, Trash2 } from "lucide-react";
 import { cn } from "@/lib/utils";
 import { Folder as FolderType } from "@/hooks/useFolders";
 import { Button } from "@/components/ui/button";
 import { TableRow, TableCell } from "@/components/ui/table";
 import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
 } from "@/components/ui/dropdown-menu";
 
 interface FolderListItemProps {
   folder: FolderType;
   onClick: () => void;
   onDelete: (id: string) => void;
 }
 
 export const FolderListItem = ({ folder, onClick, onDelete }: FolderListItemProps) => {
   const { isOver, setNodeRef } = useDroppable({
     id: folder.id,
     data: {
       type: 'folder',
       folder
     }
   });
 
   return (
     <TableRow 
       ref={setNodeRef}
       className={cn(
        "cursor-pointer hover:bg-accent/50 transition-all duration-200",
        isOver && "ring-2 ring-primary bg-primary/10"
       )}
       onClick={onClick}
     >
       <TableCell className="w-[50px]" />
       <TableCell className="w-[100px]">
        <div className={cn(
          "w-16 h-10 rounded flex items-center justify-center transition-colors",
          isOver ? "bg-primary/20" : "bg-muted"
        )}>
          {isOver ? (
            <FolderInput className="w-6 h-6 text-primary animate-pulse" />
          ) : (
            <Folder className="w-6 h-6 text-muted-foreground fill-muted-foreground/20" />
          )}
         </div>
       </TableCell>
       <TableCell className="font-medium">
         <div className="flex items-center gap-2">
          {isOver ? (
            <FolderInput className="w-4 h-4 text-primary animate-pulse" />
          ) : (
            <Folder className="w-4 h-4 text-muted-foreground" />
          )}
          <span className={cn(isOver && "text-primary font-semibold")}>{folder.name}</span>
          {isOver && (
            <span className="text-xs text-primary font-medium animate-pulse ml-2">← Soltar aqui</span>
          )}
         </div>
       </TableCell>
       <TableCell>Pasta</TableCell>
       <TableCell>-</TableCell>
       <TableCell>-</TableCell>
       <TableCell>-</TableCell>
       <TableCell className="text-right">
         <DropdownMenu>
           <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
             <Button variant="ghost" size="icon" className="h-8 w-8">
               <MoreVertical className="w-4 h-4" />
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end">
             <DropdownMenuItem 
               className="text-destructive focus:text-destructive"
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
       </TableCell>
     </TableRow>
   );
 };