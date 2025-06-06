
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Monitor, Plus, Settings, MapPin, Copy, ExternalLink, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const mockDevices = [
  {
    id: 1,
    uniqueId: "tv-001-sp-shopping",
    name: "TV Lobby Principal",
    location: "São Paulo - Shopping Center",
    status: "online",
    lastSeen: "Agora",
    resolution: "1920x1080",
    playlist: "Promoções Verão",
    audience: 234,
    cameraEnabled: true
  },
  {
    id: 2,
    uniqueId: "totem-002-rj-airport",
    name: "Totem Entrada",
    location: "Rio de Janeiro - Aeroporto",
    status: "online",
    lastSeen: "2 min atrás",
    resolution: "1080x1920",
    playlist: "Institucional",
    audience: 156,
    cameraEnabled: true
  },
  {
    id: 3,
    uniqueId: "display-003-bsb-mall",
    name: "Display Praça Alimentação",
    location: "Brasília - Mall Norte",
    status: "offline",
    lastSeen: "30 min atrás",
    resolution: "3840x2160",
    playlist: "Menu Digital",
    audience: 89,
    cameraEnabled: false
  },
  {
    id: 4,
    uniqueId: "monitor-004-sp-office",
    name: "Monitor Recepção",
    location: "São Paulo - Escritório Central",
    status: "online",
    lastSeen: "Agora",
    resolution: "2560x1440",
    playlist: "Corporativo",
    audience: 45,
    cameraEnabled: true
  }
];

const Devices = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const filteredDevices = mockDevices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    return status === "online" ? "bg-green-500" : "bg-red-500";
  };

  const getStatusVariant = (status: string) => {
    return status === "online" ? "default" : "destructive";
  };

  const copyDeviceLink = (uniqueId: string) => {
    const deviceUrl = `${window.location.origin}/device/${uniqueId}`;
    navigator.clipboard.writeText(deviceUrl);
    toast({
      title: "Link copiado!",
      description: "O link do dispositivo foi copiado para a área de transferência.",
    });
  };

  const openDevicePlayer = (uniqueId: string) => {
    const deviceUrl = `/device/${uniqueId}`;
    window.open(deviceUrl, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Dispositivos</h1>
          <p className="text-muted-foreground">Gerencie todos os displays conectados</p>
        </div>
        <Button className="gradient-primary text-white">
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Dispositivo
        </Button>
      </div>

      <div className="flex items-center space-x-4">
        <Input
          placeholder="Buscar dispositivos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDevices.map((device) => (
          <Card key={device.id} className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Monitor className="w-8 h-8 text-primary" />
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(device.status)}`}></div>
                    {device.cameraEnabled && (
                      <Camera className="absolute -bottom-1 -left-1 w-3 h-3 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{device.name}</CardTitle>
                    <CardDescription className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{device.location}</span>
                    </CardDescription>
                    <CardDescription className="text-xs font-mono text-muted-foreground mt-1">
                      ID: {device.uniqueId}
                    </CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={getStatusVariant(device.status)}>
                  {device.status === "online" ? "Online" : "Offline"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Último acesso</span>
                <span className="text-sm">{device.lastSeen}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Resolução</span>
                <span className="text-sm font-mono">{device.resolution}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Playlist Atual</span>
                <span className="text-sm font-medium">{device.playlist}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Câmera IA</span>
                <Badge variant={device.cameraEnabled ? "default" : "secondary"}>
                  {device.cameraEnabled ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Público Hoje</span>
                <span className="text-sm font-bold text-primary">{device.audience} pessoas</span>
              </div>

              <div className="border-t pt-3">
                <div className="text-xs text-muted-foreground mb-2">Link do Dispositivo:</div>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-xs bg-muted p-2 rounded text-ellipsis overflow-hidden">
                    /device/{device.uniqueId}
                  </code>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyDeviceLink(device.uniqueId)}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openDevicePlayer(device.uniqueId)}
                    className="h-8 w-8 p-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex space-x-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  Visualizar
                </Button>
                <Button size="sm" className="flex-1">
                  Configurar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Devices;
