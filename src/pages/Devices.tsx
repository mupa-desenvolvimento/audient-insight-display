import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Monitor, Plus, Settings, MapPin, Copy, ExternalLink, Camera, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDevices } from "@/hooks/useDevices";
import { usePlaylists } from "@/hooks/usePlaylists";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const Devices = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { devices, isLoading } = useDevices();
  const { playlists } = usePlaylists();

  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.store?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    device.device_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500";
      case "offline": return "bg-red-500";
      default: return "bg-yellow-500";
    }
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "secondary" => {
    switch (status) {
      case "online": return "default";
      case "offline": return "destructive";
      default: return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "online": return "Online";
      case "offline": return "Offline";
      case "pending": return "Pendente";
      default: return status;
    }
  };

  const copyDeviceLink = (deviceCode: string) => {
    const deviceUrl = `${window.location.origin}/device/${deviceCode}`;
    navigator.clipboard.writeText(deviceUrl);
    toast({
      title: "Link copiado!",
      description: "O link do dispositivo foi copiado para a área de transferência.",
    });
  };

  const openDevicePlayer = (deviceCode: string) => {
    const deviceUrl = `/device/${deviceCode}`;
    window.open(deviceUrl, '_blank');
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return "Nunca";
    return formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: ptBR });
  };

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

      {filteredDevices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Monitor className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum dispositivo encontrado</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {searchTerm 
                ? "Nenhum dispositivo corresponde à sua busca."
                : "Adicione seu primeiro dispositivo para começar a gerenciar seus displays."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map((device) => (
            <Card key={device.id} className="hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Monitor className="w-8 h-8 text-primary" />
                      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getStatusColor(device.status)}`}></div>
                      {device.camera_enabled && (
                        <Camera className="absolute -bottom-1 -left-1 w-3 h-3 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{device.name}</CardTitle>
                      <CardDescription className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{device.store?.name || "Sem loja"}</span>
                      </CardDescription>
                      <CardDescription className="text-xs font-mono text-muted-foreground mt-1">
                        ID: {device.device_code}
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
                    {getStatusLabel(device.status)}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Último acesso</span>
                  <span className="text-sm">{formatLastSeen(device.last_seen_at)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Resolução</span>
                  <span className="text-sm font-mono">{device.resolution || device.display_profile?.resolution || "-"}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Playlist Atual</span>
                  <span className="text-sm font-medium">{device.current_playlist?.name || "Nenhuma"}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Câmera IA</span>
                  <Badge variant={device.camera_enabled ? "default" : "secondary"}>
                    {device.camera_enabled ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Perfil</span>
                  <span className="text-sm">{device.display_profile?.name || "Padrão"}</span>
                </div>

                <div className="border-t pt-3">
                  <div className="text-xs text-muted-foreground mb-2">Link do Dispositivo:</div>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 text-xs bg-muted p-2 rounded text-ellipsis overflow-hidden">
                      /device/{device.device_code}
                    </code>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyDeviceLink(device.device_code)}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openDevicePlayer(device.device_code)}
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
      )}
    </div>
  );
};

export default Devices;
