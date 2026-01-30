
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const Settings = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie configurações do sistema e usuários</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="ai">IA & Câmera</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>Configure as principais opções do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="system-name">Nome do Sistema</Label>
                <Input id="system-name" defaultValue="MupaMídias Pro" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Input id="company" defaultValue="Minha Empresa" />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Modo Escuro</Label>
                  <p className="text-sm text-muted-foreground">Ativar tema escuro automaticamente</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-sync</Label>
                  <p className="text-sm text-muted-foreground">Sincronizar dados automaticamente</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de IA e Câmera</CardTitle>
              <CardDescription>Configure o reconhecimento de público</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Reconhecimento Facial</Label>
                  <p className="text-sm text-muted-foreground">Detectar pessoas automaticamente</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Análise de Gênero</Label>
                  <p className="text-sm text-muted-foreground">Identificar gênero estimado</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Análise de Idade</Label>
                  <p className="text-sm text-muted-foreground">Estimar faixa etária</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="confidence">Nível de Confiança (%)</Label>
                <Input id="confidence" type="number" defaultValue="85" min="50" max="100" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="detection-interval">Intervalo de Detecção (ms)</Label>
                <Input id="detection-interval" type="number" defaultValue="500" min="100" max="5000" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>Configure alertas e notificações do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dispositivos Offline</Label>
                  <p className="text-sm text-muted-foreground">Alertar quando dispositivos saírem do ar</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Uploads Concluídos</Label>
                  <p className="text-sm text-muted-foreground">Notificar quando uploads terminarem</p>
                </div>
                <Switch defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatórios Diários</Label>
                  <p className="text-sm text-muted-foreground">Enviar resumo diário por email</p>
                </div>
                <Switch />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="email">Email para Notificações</Label>
                <Input id="email" type="email" defaultValue="admin@empresa.com" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Usuários</CardTitle>
              <CardDescription>Controle acesso e permissões</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button className="gradient-primary text-white">
                  Adicionar Usuário
                </Button>
                <p className="text-sm text-muted-foreground">
                  Esta funcionalidade será implementada na próxima versão.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
