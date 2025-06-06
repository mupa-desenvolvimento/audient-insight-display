
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Image, FileText, Clock, Grid2x2 } from "lucide-react";

const mockMedia = [
  {
    id: 1,
    name: "Promoção Verão 2024",
    type: "image",
    duration: 10,
    size: "2.4 MB",
    resolution: "1920x1080",
    status: "active",
    playlist: "Promoções Verão",
    views: 1250
  },
  {
    id: 2,
    name: "Video Institucional",
    type: "video",
    duration: 30,
    size: "45.2 MB",
    resolution: "1920x1080",
    status: "active",
    playlist: "Institucional",
    views: 890
  },
  {
    id: 3,
    name: "Menu Especial Inverno",
    type: "image",
    duration: 15,
    size: "3.1 MB",
    resolution: "1080x1920",
    status: "draft",
    playlist: "Menu Digital",
    views: 0
  },
  {
    id: 4,
    name: "Campanha Black Friday",
    type: "video",
    duration: 20,
    size: "67.8 MB",
    resolution: "3840x2160",
    status: "scheduled",
    playlist: "Promoções",
    views: 2340
  }
];

const mockPlaylists = [
  {
    id: 1,
    name: "Promoções Verão",
    mediaCount: 12,
    duration: "4:30",
    devices: 5,
    status: "active"
  },
  {
    id: 2,
    name: "Institucional",
    mediaCount: 8,
    duration: "3:15",
    devices: 3,
    status: "active"
  },
  {
    id: 3,
    name: "Menu Digital",
    mediaCount: 15,
    duration: "6:45",
    devices: 2,
    status: "draft"
  }
];

const Media = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMedia = mockMedia.filter(media =>
    media.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
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
      default: return "Inativo";
    }
  };

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
                          <span>{media.resolution}</span>
                          <span>•</span>
                          <span>{media.size}</span>
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(media.status)}>
                      {getStatusLabel(media.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Duração</span>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span className="text-sm">{media.duration}s</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Playlist</span>
                    <span className="text-sm font-medium">{media.playlist}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Visualizações</span>
                    <span className="text-sm font-bold text-primary">{media.views.toLocaleString()}</span>
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
        </TabsContent>

        <TabsContent value="playlists" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockPlaylists.map((playlist) => (
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
                          {playlist.mediaCount} mídias • {playlist.duration}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(playlist.status)}>
                      {getStatusLabel(playlist.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Dispositivos</span>
                    <span className="text-sm font-bold text-primary">{playlist.devices}</span>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Media;
