import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import type { MediaItem } from "@/hooks/useMediaItems";

interface MediaDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: MediaItem | null;
  onConfirm: (id: string) => Promise<void>;
}

export function MediaDeleteDialog({ open, onOpenChange, media, onConfirm }: MediaDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!media) return;
    
    setDeleting(true);
    try {
      await onConfirm(media.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir mídia</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>{media?.name}</strong>?
            <br />
            Esta ação não pode ser desfeita e o arquivo será removido permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
