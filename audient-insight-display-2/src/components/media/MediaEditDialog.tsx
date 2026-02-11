import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import type { MediaItem } from "@/hooks/useMediaItems";

interface MediaEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: MediaItem | null;
  onSave: (id: string, updates: { name: string; status: string; duration?: number }) => Promise<void>;
}

export function MediaEditDialog({ open, onOpenChange, media, onSave }: MediaEditDialogProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [duration, setDuration] = useState<number>(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (media) {
      setName(media.name);
      setStatus(media.status);
      setDuration(media.duration || 10);
    }
  }, [media]);

  const handleSave = async () => {
    if (!media) return;
    
    setSaving(true);
    try {
      await onSave(media.id, { 
        name, 
        status,
        duration: media.type === "image" ? duration : undefined
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Mídia</DialogTitle>
          <DialogDescription>
            Altere as informações da mídia
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da mídia"
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus} disabled={saving}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {media?.type === "image" && (
            <div className="space-y-2">
              <Label htmlFor="duration">Duração de exibição (segundos)</Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={300}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 10)}
                disabled={saving}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
