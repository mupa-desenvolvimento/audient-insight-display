import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Image, FileText, Clock, Grid2x2, Loader2 } from "lucide-react";
import { useMediaItems } from "@/hooks/useMediaItems";
import { usePlaylists } from "@/hooks/usePlaylists";

const Media = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { mediaItems, isLoading: loadingMedia } = useMediaItems();
  const { playlists, isLoading: loadingPlaylists } = usePlaylists();

  const filteredMedia = mediaItems.filter(media =>
    media.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "active": return "default";
      case "draft": return "secondary";
      case "scheduled": return "outline";
      default: return "destructive";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Ativo";
      case "draft": return "Rascunho";
      case "scheduled": return "Agendado";
      case "inactive": return "Inativo";
      default: return status;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
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
        <Button className="gradient-primary text-white">
          <Plus className="w-4 h-4 mr-2" />
          Upload Mídia
        </Button>
      </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMedia.map((media) => (
                <Card key={media.id} className="hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          {media.type === "image" ? (
                            <Image className="w-6 h-6 text-primary" />
                          ) : (
                            <FileText className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{media.name}</CardTitle>
                          <CardDescription className="flex items-center space-x-2">
                            <span>{media.resolution || "-"}</span>
                            <span>•</span>
                            <span>{formatFileSize(media.file_size)}</span>
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={getStatusVariant(media.status)}>
                        {getStatusLabel(media.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tipo</span>
                      <span className="text-sm capitalize">{media.type}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Duração</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span className="text-sm">{media.duration || 10}s</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        Editar
                      </Button>
                      <Button size="sm" className="flex-1">
                        Agendar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
