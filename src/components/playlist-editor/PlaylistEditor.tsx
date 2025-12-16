import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePlaylists } from "@/hooks/usePlaylists";
import { usePlaylistItems } from "@/hooks/usePlaylistItems";
import { useChannels } from "@/hooks/useChannels";
import { MediaItem } from "@/hooks/useMediaItems";
import { MediaLibrary } from "./MediaLibrary";
import { PlaylistTimeline } from "./PlaylistTimeline";
import { PlaylistSettings } from "./PlaylistSettings";
import { PlaylistPreview } from "./PlaylistPreview";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  EyeOff,
  Loader2
} from "lucide-react";

interface PlaylistFormData {
  name: string;
  description: string | null;
  channel_id: string | null;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  priority: number;
}

export const PlaylistEditor = () => {
  const navigate = useNavigate();
  const { id: playlistId } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  const { playlists, updatePlaylist, createPlaylist } = usePlaylists();
  const { channels } = useChannels();
  const { 
    items, 
    isLoading: itemsLoading, 
    addItem, 
    removeItem, 
    updateItem, 
    reorderItems,
    getTotalDuration 
  } = usePlaylistItems(playlistId || null);

  const [showPreview, setShowPreview] = useState(true);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draggingMedia, setDraggingMedia] = useState<MediaItem | null>(null);

  const existingPlaylist = playlists.find((p) => p.id === playlistId);

  const [formData, setFormData] = useState<PlaylistFormData>({
    name: "",
    description: null,
    channel_id: null,
    is_active: true,
    start_date: null,
    end_date: null,
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
    start_time: "00:00",
    end_time: "23:59",
    priority: 5,
  });

  // Load existing playlist data
  useEffect(() => {
    if (existingPlaylist) {
      const schedule = existingPlaylist.schedule as Record<string, unknown> | null;
      setFormData({
        name: existingPlaylist.name,
        description: existingPlaylist.description,
        channel_id: existingPlaylist.channel_id,
        is_active: existingPlaylist.is_active,
        start_date: (schedule?.start_date as string) || null,
        end_date: (schedule?.end_date as string) || null,
        days_of_week: (schedule?.days_of_week as number[]) || [0, 1, 2, 3, 4, 5, 6],
        start_time: (schedule?.start_time as string) || "00:00",
        end_time: (schedule?.end_time as string) || "23:59",
        priority: (schedule?.priority as number) || 5,
      });
    }
  }, [existingPlaylist]);

  const handleFormChange = useCallback((updates: Partial<PlaylistFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleAddMedia = useCallback((media: MediaItem, position: number) => {
    if (!playlistId) return;
    
    addItem.mutate({
      playlist_id: playlistId,
      media_id: media.id,
      position,
      duration_override: media.duration,
    });
  }, [playlistId, addItem]);

  const handleRemoveItem = useCallback((id: string) => {
    removeItem.mutate(id);
    if (selectedItemId === id) {
      setSelectedItemId(null);
    }
  }, [removeItem, selectedItemId]);

  const handleDuplicateItem = useCallback((item: typeof items[0]) => {
    if (!playlistId) return;
    
    addItem.mutate({
      playlist_id: playlistId,
      media_id: item.media_id,
      position: items.length,
      duration_override: item.duration_override,
    });
  }, [playlistId, items.length, addItem]);

  const handleUpdateDuration = useCallback((id: string, duration: number) => {
    updateItem.mutate({ id, duration_override: duration });
  }, [updateItem]);

  const handleReorderItems = useCallback((orderedItems: { id: string; position: number }[]) => {
    reorderItems.mutate(orderedItems);
  }, [reorderItems]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    const schedule = {
      start_date: formData.start_date,
      end_date: formData.end_date,
      days_of_week: formData.days_of_week,
      start_time: formData.start_time,
      end_time: formData.end_time,
      priority: formData.priority,
    };

    const playlistData = {
      name: formData.name,
      description: formData.description,
      channel_id: formData.channel_id,
      is_active: formData.is_active,
      schedule,
    };

    try {
      if (playlistId) {
        await updatePlaylist.mutateAsync({ id: playlistId, ...playlistData });
      } else {
        await createPlaylist.mutateAsync(playlistData);
      }
      toast({ title: "Playlist salva com sucesso!" });
    } catch (error) {
      toast({ title: "Erro ao salvar playlist", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const totalDuration = getTotalDuration();

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/playlists")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">
              {playlistId ? "Editar Playlist" : "Nova Playlist"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {formData.name || "Sem nome"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Esconder Preview
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Mostrar Preview
              </>
            )}
          </Button>

          <Button onClick={handleSave} disabled={isSaving || !formData.name}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Media Library - Left */}
        <div className="w-72 flex-shrink-0">
          <MediaLibrary onDragStart={setDraggingMedia} />
        </div>

        {/* Center Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Preview */}
          {showPreview && (
            <div className="p-4 border-b bg-muted/30">
              <div className="max-w-md mx-auto">
                <PlaylistPreview
                  items={items}
                  isPlaying={isPreviewPlaying}
                  onTogglePlay={() => setIsPreviewPlaying(!isPreviewPlaying)}
                />
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="flex-1 overflow-hidden">
            <PlaylistTimeline
              items={items}
              selectedItemId={selectedItemId}
              onSelectItem={setSelectedItemId}
              onAddMedia={handleAddMedia}
              onRemoveItem={handleRemoveItem}
              onDuplicateItem={handleDuplicateItem}
              onUpdateDuration={handleUpdateDuration}
              onReorderItems={handleReorderItems}
              totalDuration={totalDuration}
            />
          </div>
        </div>

        {/* Settings - Right */}
        <div className="w-80 flex-shrink-0">
          <PlaylistSettings
            playlist={formData}
            channels={channels}
            itemCount={items.length}
            totalDuration={totalDuration}
            onChange={handleFormChange}
          />
        </div>
      </div>
    </div>
  );
};
