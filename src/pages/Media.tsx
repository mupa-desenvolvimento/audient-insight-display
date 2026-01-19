import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus, Image, Video, Clock, Grid2x2, Loader2, Play, Eye, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useMediaItems, MediaItem } from "@/hooks/useMediaItems";
import { usePlaylists } from "@/hooks/usePlaylists";
import { MediaUploadDialog } from "@/components/media/MediaUploadDialog";
import { MediaLightbox } from "@/components/media/MediaLightbox";
import { MediaEditDialog } from "@/components/media/MediaEditDialog";
import { MediaDeleteDialog } from "@/components/media/MediaDeleteDialog";
import { useQueryClient } from "@tanstack/react-query";

const Media = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  
  const queryClient = useQueryClient();
  const { mediaItems, isLoading: loadingMedia, updateMediaItem, deleteMediaItem } = useMediaItems();
  const { playlists, isLoading: loadingPlaylists } = usePlaylists();

  const filteredMedia = mediaItems.filter(media =>
    media.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "active": return "default";
      case "draft": return "secondary";
      case "scheduled": return "outline";
      case "processing": return "outline";
      default: return "destructive";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Ativo";
      case "draft": return "Rascunho";
      case "scheduled": return "Agendado";
      case "inactive": return "Inativo";
      case "processing": return "Processando";
      default: return status;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handleEdit = (media: MediaItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedMedia(media);
    setEditDialogOpen(true);
  };

  const handleDelete = (media: MediaItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedMedia(media);
    setDeleteDialogOpen(true);
  };

  const handleSaveMedia = async (id: string, updates: { name: string; status: string; duration?: number }) => {
    await updateMediaItem.mutateAsync({ id, ...updates });
  };

  const handleConfirmDelete = async (id: string) => {
    await deleteMediaItem.mutateAsync(id);
  };

  const isLoading = loadingMedia || loadingPlaylists;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Mídias</h1>
          <p className="text-muted-foreground">Gerencie conteúdos e playlists</p>
        </div>
        <Button className="gradient-primary text-white" onClick={() => setUploadDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Upload Mídia
        </Button>
      </div>

      <MediaUploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["media-items"] })}
      />

      <MediaLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        mediaItems={filteredMedia}
        initialIndex={lightboxIndex}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <MediaEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        media={selectedMedia}
        onSave={handleSaveMedia}
      />

      <MediaDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        media={selectedMedia}
        onConfirm={handleConfirmDelete}
      />

      <Tabs defaultValue="media" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="media">Mídias</TabsTrigger>
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
        </TabsList>

        <TabsContent value="media" className="space-y-6">
          <div className="flex items-center space-x-4">
            <Input
              placeholder="Buscar mídias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {filteredMedia.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Image className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma mídia encontrada</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {searchTerm 
                    ? "Nenhuma mídia corresponde à sua busca."
                    : "Faça upload da sua primeira mídia para começar."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredMedia.map((media, index) => {
                // Use thumbnail_url field directly, fallback to file_url
                const thumbnailUrl = media.thumbnail_url || media.file_url;
                
                const openLightbox = () => {
                  setLightboxIndex(index);
                  setLightboxOpen(true);
                };
                
                return (
                  <Card 
                    key={media.id} 
                    className="group hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer"
                    onClick={openLightbox}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      {thumbnailUrl ? (
                        media.type === "video" ? (
                          <>
                            <video
                              src={media.file_url || ''}
                              className="w-full h-full object-cover"
                              muted
                              preload="metadata"
                              onLoadedData={(e) => {
                                const video = e.currentTarget;
                                if (video.duration > 1) {
                                  video.currentTime = 1;
                                }
                              }}
                              onMouseEnter={(e) => {
                                const video = e.currentTarget;
                                video.play().catch(() => {});
                              }}
                              onMouseLeave={(e) => {
                                const video = e.currentTarget;
                                video.pause();
                                if (video.duration > 1) {
                                  video.currentTime = 1;
                                } else {
                                  video.currentTime = 0;
                                }
                              }}
                              onError={() => {
                                console.warn('Video preview error:', media.name);
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors pointer-events-none">
                              <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Play className="w-5 h-5 text-white ml-0.5" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <img
                            src={thumbnailUrl}
                            alt={media.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              console.warn('Image preview error:', media.name);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {media.type === "video" ? (
                            <Video className="w-10 h-10 text-muted-foreground" />
                          ) : (
                            <Image className="w-10 h-10 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      
                      {/* Status badge overlay */}
                      <div className="absolute top-2 right-2">
                        <Badge variant={getStatusVariant(media.status)} className="text-xs">
                          {getStatusLabel(media.status)}
                        </Badge>
                      </div>
                      
                      {/* Duration badge for videos */}
                      {media.type === "video" && media.duration && (
                        <div className="absolute bottom-2 right-2">
                          <span className="px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                            {Math.floor(media.duration / 60)}:{String(media.duration % 60).padStart(2, '0')}
                          </span>
                        </div>
                      )}
                      
                      {/* Type icon overlay */}
                      <div className="absolute bottom-2 left-2">
                        <div className="w-6 h-6 rounded bg-black/60 flex items-center justify-center">
                          {media.type === "video" ? (
                            <Video className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Image className="w-3.5 h-3.5 text-white" />
                          )}
                        </div>
                      </div>
                      
                      {/* Hover overlay with action buttons */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLightbox();
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        </div>
                      </div>

                      {/* Actions menu */}
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="secondary" size="icon" className="h-7 w-7">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={(e) => handleEdit(media, e as unknown as React.MouseEvent)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={(e) => handleDelete(media, e as unknown as React.MouseEvent)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  
                    {/* Info */}
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm truncate" title={media.name}>
                        {media.name}
                      </h3>
                      <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                        <span>{media.resolution || "-"}</span>
                        <span>{formatFileSize(media.file_size)}</span>
                      </div>
                      {media.type === "image" && (
                        <div className="flex items-center mt-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>{media.duration || 10}s</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="playlists" className="space-y-6">
          {playlists.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Grid2x2 className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma playlist encontrada</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Crie sua primeira playlist para organizar suas mídias.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {playlists.map((playlist) => (
                <Card key={playlist.id} className="hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <Grid2x2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{playlist.name}</CardTitle>
                          <CardDescription>
                            {playlist.channel?.name || "Sem canal"}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={playlist.is_active ? "default" : "secondary"}>
                        {playlist.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Canal</span>
                      <span className="text-sm font-medium">{playlist.channel?.type || "-"}</span>
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Editar
                      </Button>
                      <Button size="sm" className="flex-1">
                        Publicar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Media;
