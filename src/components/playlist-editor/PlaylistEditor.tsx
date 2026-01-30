import { useState, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePlaylists } from "@/hooks/usePlaylists";
import { usePlaylistItems } from "@/hooks/usePlaylistItems";
import { useChannels } from "@/hooks/useChannels";
import { useDevices } from "@/hooks/useDevices";
import { MediaItem } from "@/hooks/useMediaItems";
import { EditorSidebar } from "./EditorSidebar";
import { EditorCanvas } from "./EditorCanvas";
import { EditorTimeline } from "./EditorTimeline";
import { EditorHeader } from "./EditorHeader";
import { EditorPropertiesPanel } from "./EditorPropertiesPanel";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
  const { devices } = useDevices();
  const [createdPlaylistId, setCreatedPlaylistId] = useState<string | null>(null);
  
  const activePlaylistId = createdPlaylistId || playlistId || null;
  
  const { 
    items, 
    isLoading: itemsLoading, 
    addItem, 
    removeItem, 
    updateItem, 
    reorderItems,
    getTotalDuration 
  } = usePlaylistItems(activePlaylistId);

  const [activePanel, setActivePanel] = useState<"media" | "settings" | null>("media");
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingDevices, setIsUpdatingDevices] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [zoom, setZoom] = useState(100);

  const existingPlaylist = playlists.find((p) => p.id === activePlaylistId);
  const isNewPlaylist = !playlistId && !createdPlaylistId;
  const connectedDevices = devices.filter(d => d.current_playlist_id === activePlaylistId);

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
    setHasUnsavedChanges(true);
  }, []);

  const ensurePlaylistExists = async (): Promise<string | null> => {
    if (activePlaylistId) return activePlaylistId;
    
    const tempName = formData.name || `Nova Playlist ${new Date().toLocaleString("pt-BR")}`;
    
    const schedule = {
      start_date: formData.start_date,
      end_date: formData.end_date,
      days_of_week: formData.days_of_week,
      start_time: formData.start_time,
      end_time: formData.end_time,
      priority: formData.priority,
    };

    const playlistData = {
      name: tempName,
      description: formData.description,
      channel_id: formData.channel_id,
      is_active: formData.is_active,
      schedule,
    };

    try {
      const result = await createPlaylist.mutateAsync(playlistData);
      setCreatedPlaylistId(result.id);
      setFormData(prev => ({ ...prev, name: tempName }));
      return result.id;
    } catch (error) {
      toast({ title: "Erro ao criar playlist", variant: "destructive" });
      return null;
    }
  };

  const handleAddMedia = useCallback(async (media: MediaItem, position: number) => {
    const id = await ensurePlaylistExists();
    if (!id) return;
    
    addItem.mutate({
      playlist_id: id,
      media_id: media.id,
      position,
      duration_override: media.duration,
    });
  }, [activePlaylistId, addItem, formData, createPlaylist]);

  const handleRemoveItem = useCallback((id: string) => {
    removeItem.mutate(id);
    if (selectedItemId === id) {
      setSelectedItemId(null);
    }
  }, [removeItem, selectedItemId]);

  const handleDuplicateItem = useCallback(async (item: typeof items[0]) => {
    const id = await ensurePlaylistExists();
    if (!id) return;
    
    addItem.mutate({
      playlist_id: id,
      media_id: item.media_id,
      position: items.length,
      duration_override: item.duration_override,
    });
  }, [items.length, addItem, ensurePlaylistExists]);

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
      if (activePlaylistId) {
        await updatePlaylist.mutateAsync({ id: activePlaylistId, ...playlistData });
      } else {
        const result = await createPlaylist.mutateAsync(playlistData);
        setCreatedPlaylistId(result.id);
      }
      setHasUnsavedChanges(false);
      toast({ title: "Projeto salvo!" });
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateDevices = async () => {
    if (!activePlaylistId) {
      toast({ 
        title: "Salve a playlist primeiro", 
        variant: "destructive" 
      });
      return;
    }

    setIsUpdatingDevices(true);

    try {
      // First, update the playlist's updated_at to signal changes
      const { error: playlistError } = await supabase
        .from("playlists")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", activePlaylistId);

      if (playlistError) throw playlistError;

      // Then update all devices connected to this playlist
      const { data: devicesData, error: fetchError } = await supabase
        .from("devices")
        .select("id")
        .eq("current_playlist_id", activePlaylistId);

      if (fetchError) throw fetchError;

      const deviceIds = devicesData?.map(d => d.id) || [];

      if (deviceIds.length > 0) {
        const { error: updateError } = await supabase
          .from("devices")
          .update({ updated_at: new Date().toISOString() })
          .in("id", deviceIds);

        if (updateError) throw updateError;
      }

      toast({ 
        title: "Sincronização enviada!", 
        description: `${deviceIds.length} dispositivo(s) serão atualizados` 
      });
    } catch (error) {
      console.error("Error updating devices:", error);
      toast({ title: "Erro ao sincronizar", variant: "destructive" });
    } finally {
      setIsUpdatingDevices(false);
    }
  };

  const totalDuration = getTotalDuration();
  const selectedItem = items.find(i => i.id === selectedItemId);
  const currentPreviewItem = items[currentPreviewIndex];

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <EditorHeader
        projectName={formData.name || "Novo Projeto"}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        isUpdatingDevices={isUpdatingDevices}
        connectedDevicesCount={connectedDevices.length}
        onBack={() => navigate("/admin/playlists")}
        onSave={handleSave}
        onUpdateDevices={handleUpdateDevices}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools */}
        <EditorSidebar
          activePanel={activePanel}
          onPanelChange={setActivePanel}
        />

        {/* Left Panel - Media Library or Settings */}
        {activePanel && (
          <EditorPropertiesPanel
            activePanel={activePanel}
            formData={formData}
            channels={channels}
            itemCount={items.length}
            totalDuration={totalDuration}
            connectedDevicesCount={connectedDevices.length}
            onFormChange={handleFormChange}
            onAddMedia={handleAddMedia}
            itemsLength={items.length}
          />
        )}

        {/* Center - Canvas/Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <EditorCanvas
            currentItem={currentPreviewItem}
            isPlaying={isPreviewPlaying}
            onTogglePlay={() => setIsPreviewPlaying(!isPreviewPlaying)}
            onPrevious={() => setCurrentPreviewIndex(Math.max(0, currentPreviewIndex - 1))}
            onNext={() => {
              if (currentPreviewIndex >= items.length - 1) {
                // Loop back to start
                setCurrentPreviewIndex(0);
              } else {
                setCurrentPreviewIndex(currentPreviewIndex + 1);
              }
            }}
            currentIndex={currentPreviewIndex}
            totalItems={items.length}
            zoom={zoom}
            onZoomChange={setZoom}
          />

          {/* Timeline */}
          <EditorTimeline
            items={items}
            selectedItemId={selectedItemId}
            currentPreviewIndex={currentPreviewIndex}
            onSelectItem={setSelectedItemId}
            onSetPreviewIndex={setCurrentPreviewIndex}
            onAddMedia={handleAddMedia}
            onRemoveItem={handleRemoveItem}
            onDuplicateItem={handleDuplicateItem}
            onUpdateDuration={handleUpdateDuration}
            onReorderItems={handleReorderItems}
            totalDuration={totalDuration}
            isPlaying={isPreviewPlaying}
          />
        </div>
      </div>
    </div>
  );
};
