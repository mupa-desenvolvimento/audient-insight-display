import { useDraggable } from "@dnd-kit/core";
import { MediaItem } from "@/hooks/useMediaItems";

interface DraggableMediaWrapperProps {
  media: MediaItem;
  children: React.ReactNode;
}

export const DraggableMediaWrapper = ({ media, children }: DraggableMediaWrapperProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: media.id,
    data: {
      type: 'media',
      media
    }
  });
  
  const style = {
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="h-full">
      {children}
    </div>
  );
};
