import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Monitor, Plus, MapPin, Copy, ExternalLink, Camera, Loader2, Trash2, Pencil, Lock, Settings2, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDevices, DeviceInsert, DeviceUpdate, DeviceWithRelations } from "@/hooks/useDevices";
import { usePlaylists } from "@/hooks/usePlaylists";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DeviceFormDialog } from "@/components/devices/DeviceFormDialog";
import { DeviceControlDialog } from "@/components/devices/DeviceControlDialog";
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

const Devices = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [controlDialogOpen, setControlDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceWithRelations | null>(null);
  const [controlDevice, setControlDevice] = useState<DeviceWithRelations | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<DeviceWithRelations | null>(null);
  const { toast } = useToast();
  const { devices, isLoading, createDevice, updateDevice, deleteDevice, refetch } = useDevices();
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
    const deviceUrl = `${window.location.origin}/play/${deviceCode}`;
    navigator.clipboard.writeText(deviceUrl);
    toast({
      title: "Link copiado!",
      description: "O link do dispositivo foi copiado para a área de transferência.",
    });
  };

  const openDevicePlayer = (deviceCode: string) => {
    const deviceUrl = `/play/${deviceCode}`;
    window.open(deviceUrl, '_blank');
  };

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return "Nunca";
    return formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: ptBR });
  };

  const handleAddDevice = () => {
    setEditingDevice(null);
    setDialogOpen(true);
  };

  const handleEditDevice = (device: DeviceWithRelations) => {
    setEditingDevice(device);
    setDialogOpen(true);
  };

  const handleDeleteClick = (device: DeviceWithRelations) => {
    setDeviceToDelete(device);
    setDeleteDialogOpen(true);
  };

  const handleOpenControl = (device: DeviceWithRelations) => {
    setControlDevice(device);
    setControlDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deviceToDelete) {
      await deleteDevice.mutateAsync(deviceToDelete.id);
      setDeleteDialogOpen(false);
      setDeviceToDelete(null);
    }
  };

  const handleFormSubmit = async (data: DeviceInsert | (DeviceUpdate & { id: string })) => {
    if ('id' in data && data.id) {
      const { id, ...updates } = data;
      await updateDevice.mutateAsync({ id, ...updates });
    } else {
      await createDevice.mutateAsync(data as DeviceInsert);
    }
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
        <Button className="gradient-primary text-white" onClick={handleAddDevice}>
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
            {!searchTerm && (
              <Button className="mt-4" onClick={handleAddDevice}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Dispositivo
              </Button>
            )}
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
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleOpenControl(device)}
                      title="Controle do dispositivo"
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditDevice(device)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(device)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status especiais: Bloqueado ou Mídia Avulsa */}
                {(device as any).is_blocked && (
                  <div className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <Lock className="w-4 h-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">Bloqueado</span>
                  </div>
                )}
                
                {!(device as any).is_blocked && (device as any).override_media_id && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <Image className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Mídia Avulsa Ativa</span>
                  </div>
                )}

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
                  <div className="text-xs text-muted-foreground mb-2">Link do Player:</div>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 text-xs bg-muted p-2 rounded text-ellipsis overflow-hidden">
                      /play/{device.device_code}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeviceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        device={editingDevice}
        onSubmit={handleFormSubmit}
        isLoading={createDevice.isPending || updateDevice.isPending}
      />

      <DeviceControlDialog
        open={controlDialogOpen}
        onOpenChange={setControlDialogOpen}
        device={controlDevice}
        onUpdate={() => refetch()}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Dispositivo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o dispositivo "{deviceToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Devices;
