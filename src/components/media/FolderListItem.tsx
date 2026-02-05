 import { useDroppable } from "@dnd-kit/core";
 import { Folder, MoreVertical, Trash2 } from "lucide-react";
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
         "cursor-pointer hover:bg-accent/50 transition-colors",
         isOver && "ring-2 ring-primary bg-accent"
       )}
       onClick={onClick}
     >
       <TableCell className="w-[50px]" />
       <TableCell className="w-[100px]">
         <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
           <Folder className={cn("w-6 h-6 text-muted-foreground fill-muted-foreground/20", isOver && "text-primary fill-primary/20")} />
         </div>
       </TableCell>
       <TableCell className="font-medium">
         <div className="flex items-center gap-2">
           <Folder className={cn("w-4 h-4 text-muted-foreground", isOver && "text-primary")} />
           <span>{folder.name}</span>
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