import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor, DragEndEvent } from "@dnd-kit/core";
import { FolderPlus, ChevronLeft, ChevronRight, Folder as FolderIcon } from "lucide-react";
import { useFolders, Folder as FolderType } from "@/hooks/useFolders";
import { FolderGridItem } from "@/components/media/FolderGridItem";
import { DraggableMediaWrapper } from "@/components/media/DraggableMediaWrapper";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import { 
  Plus, 
  Image, 
  Video, 
  Clock, 
  Grid2x2, 
  Loader2, 
  Play, 
  Eye, 
  MoreVertical, 
  Pencil, 
  Trash2,
  LayoutGrid,
  LayoutList,
  AlertTriangle,
  HardDrive
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { useMediaItems, MediaItem } from "@/hooks/useMediaItems";
import { usePlaylists } from "@/hooks/usePlaylists";
import { MediaUploadDialog } from "@/components/media/MediaUploadDialog";
import { MediaLightbox } from "@/components/media/MediaLightbox";
import { MediaEditDialog } from "@/components/media/MediaEditDialog";
import { MediaDeleteDialog } from "@/components/media/MediaDeleteDialog";
import { useQueryClient } from "@tanstack/react-query";

import { useToast } from "@/hooks/use-toast";

const Media = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  
  // New state for view mode and selection
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Folder state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{id: string, name: string}[]>([]);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const { folders, createFolder, deleteFolder } = useFolders(currentFolderId);
  const { mediaItems, isLoading: loadingMedia, updateMediaItem, deleteMediaItem, moveMediaItem, refetch } = useMediaItems(currentFolderId);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Check if we dropped a media item onto a folder
    if (active.data.current?.type === 'media' && over.data.current?.type === 'folder') {
        moveMediaItem.mutate({ mediaId: activeId, folderId: overId });
    }
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder.mutate({
      name: newFolderName,
      parent_id: currentFolderId
    }, {
      onSuccess: () => {
        setCreateFolderOpen(false);
        setNewFolderName("");
      }
    });
  };

  const navigateToFolder = (folder: FolderType) => {
    setFolderPath([...folderPath, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
  };

  const navigateUp = () => {
    const newPath = folderPath.slice(0, -1);
    setFolderPath(newPath);
    setCurrentFolderId(newPath.length > 0 ? newPath[newPath.length-1].id : null);
  };
  
  const queryClient = useQueryClient();
  const { playlists, isLoading: loadingPlaylists } = usePlaylists();

  const filteredMedia = mediaItems.filter(media =>
    media.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate total storage
  const totalStorageBytes = mediaItems.reduce((acc, item) => acc + (item.file_size || 0), 0);
  const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(1);

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedMediaIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedMediaIds(newSet);
  };

  const toggleAllSelection = () => {
    if (selectedMediaIds.size === filteredMedia.length) {
      setSelectedMediaIds(new Set());
    } else {
      setSelectedMediaIds(new Set(filteredMedia.map(m => m.id)));
    }
  };

  const handleBulkDelete = async () => {
    setIsBulkDeleting(true);
    try {
      const promises = Array.from(selectedMediaIds).map(id => deleteMediaItem.mutateAsync(id));
      await Promise.all(promises);
      setSelectedMediaIds(new Set());
      setBulkDeleteDialogOpen(false);
      toast({ title: "Mídias excluídas com sucesso" });
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast({ title: "Erro ao excluir mídias", variant: "destructive" });
    } finally {
      setIsBulkDeleting(false);
    }
  };

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
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-4">
        {/* Navigation and Actions */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 overflow-hidden w-full md:w-auto">
             {currentFolderId && (
               <Button variant="ghost" onClick={navigateUp} className="mr-2 shrink-0">
                 <ChevronLeft className="w-4 h-4 mr-1" />
                 Voltar
               </Button>
             )}
             <div className="flex items-center text-sm font-medium overflow-x-auto no-scrollbar whitespace-nowrap">
                <span 
                  className={`flex items-center hover:bg-accent px-2 py-1 rounded cursor-pointer ${!currentFolderId ? "font-bold text-foreground" : "text-muted-foreground"}`}
                  onClick={() => {
                    setCurrentFolderId(null);
                    setFolderPath([]);
                  }}
                >
                  <HardDrive className="w-4 h-4 mr-1" />
                  Raiz
                </span>
                {folderPath.map((folder, index) => (
                  <span key={folder.id} className="flex items-center">
                    <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground shrink-0" />
                    <span 
                       className={`hover:bg-accent px-2 py-1 rounded cursor-pointer ${index === folderPath.length - 1 ? "font-bold text-foreground" : "text-muted-foreground"}`}
                       onClick={() => {
                         const newPath = folderPath.slice(0, index + 1);
                         setFolderPath(newPath);
                         setCurrentFolderId(folder.id);
                       }}
                    >
                      {folder.name}
                    </span>
                  </span>
                ))}
             </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Nova Pasta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Nova Pasta</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="name">Nome da Pasta</Label>
                  <Input 
                    id="name" 
                    value={newFolderName} 
                    onChange={(e) => setNewFolderName(e.target.value)} 
                    placeholder="Nome da pasta"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateFolder}>Criar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button className="gradient-primary text-white" onClick={() => setUploadDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Upload Mídia
            </Button>
          </div>
        </div>
      </div>

      <MediaUploadDialog 
        open={uploadDialogOpen} 
        onOpenChange={setUploadDialogOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["media-items"] });
          refetch();
        }}
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

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mídias selecionadas</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedMediaIds.size} itens selecionados?
              <br />
              Esta ação não pode ser desfeita e os arquivos serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Selecionados
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="media" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="media">Mídias</TabsTrigger>
          <TabsTrigger value="playlists">Playlists</TabsTrigger>
        </TabsList>

        <TabsContent value="media" className="space-y-6">
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
              <AlertTriangle className="h-4 w-4 text-red-800" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>
                Mídias não utilizadas por mais de 30 dias serão removidas automaticamente do sistema.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center space-x-2 w-full md:w-auto">
                <Input
                  placeholder="Buscar mídias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto justify-end">
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-md">
                <HardDrive className="w-4 h-4" />
                <span>Uso: {totalStorageMB} MB</span>
              </div>

              {selectedMediaIds.size > 0 && (
                <div className="flex items-center gap-2">
                   {selectedMediaIds.size === 1 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const id = Array.from(selectedMediaIds)[0];
                        const item = mediaItems.find(m => m.id === id);
                        if (item) handleEdit(item);
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  )}
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir ({selectedMediaIds.size})
                  </Button>
                </div>
              )}

              <div className="flex items-center border rounded-md bg-background">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  onClick={() => setViewMode("list")}
                >
                  <LayoutList className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {folders && folders.length > 0 && (
             <div className="space-y-2">
               <h3 className="text-sm font-medium text-muted-foreground">Pastas</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {folders.map(folder => (
                    <FolderGridItem 
                      key={folder.id} 
                      folder={folder} 
                      onClick={() => navigateToFolder(folder)}
                      onDelete={(id) => deleteFolder.mutate(id)}
                    />
                  ))}
               </div>
             </div>
          )}

          {filteredMedia.length === 0 && (!folders || folders.length === 0) ? (
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
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredMedia.map((media, index) => {
                // Use thumbnail_url field directly, fallback to file_url
                const thumbnailUrl = media.thumbnail_url || media.file_url;
                const isSelected = selectedMediaIds.has(media.id);
                
                const openLightbox = () => {
                  if (selectedMediaIds.size > 0) {
                    toggleSelection(media.id);
                    return;
                  }
                  setLightboxIndex(index);
                  setLightboxOpen(true);
                };
                
                return (
                  <DraggableMediaWrapper key={media.id} media={media}>
                  <Card 
                    className={`group hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer border-2 ${isSelected ? 'border-primary' : 'border-transparent'} h-full`}
                    onClick={openLightbox}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-muted overflow-hidden">
                      <div className="absolute top-2 left-2 z-10" onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(media.id)}
                          className={`bg-white/90 border-black/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                        />
                      </div>

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
                      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity pl-8">
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
                  </DraggableMediaWrapper>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={selectedMediaIds.size === filteredMedia.length && filteredMedia.length > 0}
                        onCheckedChange={toggleAllSelection}
                      />
                    </TableHead>
                    <TableHead className="w-[100px]">Preview</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMedia.map((media, index) => {
                    const isSelected = selectedMediaIds.has(media.id);
                    const thumbnailUrl = media.thumbnail_url || media.file_url;

                    return (
                      <TableRow key={media.id} className={isSelected ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(media.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div 
                            className="w-16 h-10 bg-muted rounded overflow-hidden relative cursor-pointer"
                            onClick={() => {
                              setLightboxIndex(index);
                              setLightboxOpen(true);
                            }}
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
                              onClick={(e) => handleEdit(media, e as unknown as React.MouseEvent)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => handleDelete(media, e as unknown as React.MouseEvent)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          </DndContext>
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
