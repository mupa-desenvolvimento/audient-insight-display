 import { useDraggable } from "@dnd-kit/core";
 import { MediaItem } from "@/hooks/useMediaItems";
 import { TableRow, TableCell } from "@/components/ui/table";
 import { Checkbox } from "@/components/ui/checkbox";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Video, Image, Clock, Pencil, Trash2, GripVertical, Eye } from "lucide-react";
  import { cn } from "@/lib/utils";
  import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
  import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
  
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
 
   const style = {
    opacity: isDragging ? 0.5 : 1,
  };
 
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
        <HoverCard>
          <HoverCardTrigger asChild>
            <div 
              className="w-16 h-10 bg-muted rounded overflow-hidden relative cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
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
          </HoverCardTrigger>
          <HoverCardContent className="w-80 p-0 overflow-hidden" align="start">
             {thumbnailUrl && (
               <div className="aspect-video w-full bg-muted flex items-center justify-center overflow-hidden">
                 <img 
                   src={thumbnailUrl} 
                   alt={media.name}
                   className="w-full h-full object-contain"
                 />
               </div>
             )}
             <div className="p-4 bg-card">
               <h4 className="font-semibold text-sm truncate mb-1">{media.name}</h4>
               <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{media.type.toUpperCase()}</span>
                  <span>{media.resolution || "N/A"}</span>
               </div>
             </div>
          </HoverCardContent>
        </HoverCard>
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex flex-col">
          <span className="truncate max-w-[200px] font-bold text-foreground" title={media.name}>{media.name}</span>
          <span className="text-xs text-muted-foreground">{media.resolution || "-"}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 text-muted-foreground">
          {media.type === 'video' ? (
            <Video className="w-4 h-4" />
          ) : (
            <Image className="w-4 h-4" />
          )}
          <span className="capitalize text-sm">{media.type}</span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{formatFileSize(media.file_size)}</TableCell>
      <TableCell>
        {media.duration ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{Math.floor(media.duration / 60)}:{String(media.duration % 60).padStart(2, '0')}</span>
          </div>
        ) : <span className="text-muted-foreground">-</span>}
      </TableCell>
      <TableCell>
        <Badge variant={getStatusVariant(media.status)} className="text-xs font-semibold">
          {getStatusLabel(media.status)}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={(e) => onEdit(media, e)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Editar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => onDelete(media, e)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Excluir</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
     </TableRow>
   );
 };