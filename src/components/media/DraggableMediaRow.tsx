 import { useDraggable } from "@dnd-kit/core";
 import { MediaItem } from "@/hooks/useMediaItems";
 import { TableRow, TableCell } from "@/components/ui/table";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Video, Image, Clock, Pencil, Trash2, GripVertical } from "lucide-react";
 import { cn } from "@/lib/utils";
 
 interface DraggableMediaRowProps {
   media: MediaItem;
   index: number;
   isSelected: boolean;
   onToggleSelection: (id: string) => void;
   onOpenLightbox: (index: number) => void;
   onEdit: (media: MediaItem, e?: React.MouseEvent) => void;
   onDelete: (media: MediaItem, e?: React.MouseEvent) => void;
   formatFileSize: (bytes: number | null) => string;
   getStatusVariant: (status: string) => "default" | "secondary" | "outline" | "destructive";
   getStatusLabel: (status: string) => string;
 }
 
 export const DraggableMediaRow = ({
   media,
   index,
   isSelected,
   onToggleSelection,
   onOpenLightbox,
   onEdit,
   onDelete,
   formatFileSize,
   getStatusVariant,
   getStatusLabel,
 }: DraggableMediaRowProps) => {
   const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
     id: media.id,
     data: {
       type: 'media',
       media
     }
   });
 
   const thumbnailUrl = media.thumbnail_url || media.file_url;
 
   const style = transform ? {
     transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
     zIndex: isDragging ? 50 : undefined,
     opacity: isDragging ? 0.5 : 1,
   } : undefined;
 
   return (
     <TableRow 
       ref={setNodeRef} 
       style={style}
       className={cn(isSelected ? "bg-muted/50" : "", isDragging && "shadow-lg")}
     >
       <TableCell className="w-[50px]">
         <div className="flex items-center gap-2">
           <div 
             {...listeners} 
             {...attributes} 
             className="cursor-grab active:cursor-grabbing p-1 hover:bg-accent rounded"
           >
             <GripVertical className="w-4 h-4 text-muted-foreground" />
           </div>
           <Checkbox 
             checked={isSelected}
             onCheckedChange={() => onToggleSelection(media.id)}
           />
         </div>
       </TableCell>
       <TableCell>
         <div 
           className="w-16 h-10 bg-muted rounded overflow-hidden relative cursor-pointer"
           onClick={() => onOpenLightbox(index)}
         >
           {thumbnailUrl ? (
             <img 
               src={thumbnailUrl} 
               alt={media.name}
               className="w-full h-full object-cover"
             />
           ) : (
             <div className="flex items-center justify-center w-full h-full">
               {media.type === 'video' ? (
                 <Video className="w-4 h-4 text-muted-foreground" />
               ) : (
                 <Image className="w-4 h-4 text-muted-foreground" />
               )}
             </div>
           )}
         </div>
       </TableCell>
       <TableCell className="font-medium">
         <div className="flex flex-col">
           <span className="truncate max-w-[200px]" title={media.name}>{media.name}</span>
           <span className="text-xs text-muted-foreground">{media.resolution || "-"}</span>
         </div>
       </TableCell>
       <TableCell>
         <div className="flex items-center gap-2">
           {media.type === 'video' ? (
             <Video className="w-4 h-4 text-muted-foreground" />
           ) : (
             <Image className="w-4 h-4 text-muted-foreground" />
           )}
           <span className="capitalize">{media.type}</span>
         </div>
       </TableCell>
       <TableCell>{formatFileSize(media.file_size)}</TableCell>
       <TableCell>
         {media.duration ? (
           <div className="flex items-center gap-1">
             <Clock className="w-3 h-3 text-muted-foreground" />
             <span>{Math.floor(media.duration / 60)}:{String(media.duration % 60).padStart(2, '0')}</span>
           </div>
         ) : "-"}
       </TableCell>
       <TableCell>
         <Badge variant={getStatusVariant(media.status)} className="text-xs">
           {getStatusLabel(media.status)}
         </Badge>
       </TableCell>
       <TableCell className="text-right">
         <div className="flex justify-end gap-2">
           <Button 
             variant="ghost" 
             size="icon"
             onClick={(e) => onEdit(media, e)}
           >
             <Pencil className="w-4 h-4" />
           </Button>
           <Button 
             variant="ghost" 
             size="icon"
             className="text-destructive hover:text-destructive"
             onClick={(e) => onDelete(media, e)}
           >
             <Trash2 className="w-4 h-4" />
           </Button>
         </div>
       </TableCell>
     </TableRow>
   );
 };