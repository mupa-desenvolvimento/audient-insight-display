
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

const demographicData = [
  { age: '0-17', male: 23, female: 22 },
  { age: '18-25', male: 67, female: 56 },
  { age: '26-35', male: 89, female: 78 },
  { age: '36-50', male: 45, female: 44 },
  { age: '51+', male: 18, female: 16 },
];

const engagementData = [
  { hour: '06:00', attention: 2.1, dwell: 3.2 },
  { hour: '08:00', attention: 3.4, dwell: 4.1 },
  { hour: '10:00', attention: 4.2, dwell: 5.3 },
  { hour: '12:00', attention: 5.8, dwell: 7.2 },
  { hour: '14:00', attention: 4.9, dwell: 6.1 },
  { hour: '16:00', attention: 6.2, dwell: 8.4 },
  { hour: '18:00', attention: 7.1, dwell: 9.2 },
  { hour: '20:00', attention: 5.5, dwell: 6.8 },
  { hour: '22:00', attention: 3.2, dwell: 4.1 },
];

const devicePerformance = [
  { device: 'TV Lobby', views: 2340, engagement: 87 },
  { device: 'Totem Entrada', views: 1890, engagement: 92 },
  { device: 'Display Praça', views: 1560, engagement: 78 },
  { device: 'Monitor Recepção', views: 890, engagement: 95 },
];

const contentData = [
  { name: 'Promoção Verão', views: 1234, clicks: 89, ctr: 7.2 },
  { name: 'Video Institucional', views: 987, clicks: 45, ctr: 4.6 },
  { name: 'Menu Especial', views: 756, clicks: 67, ctr: 8.9 },
  { name: 'Black Friday', views: 2340, clicks: 234, ctr: 10.0 },
];

const Analytics = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Análise detalhada de audience e performance</p>
        </div>
        <Select defaultValue="7days">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="7days">Últimos 7 dias</SelectItem>
            <SelectItem value="30days">Últimos 30 dias</SelectItem>
            <SelectItem value="90days">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="audience" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="audience">Audiência</TabsTrigger>
          <TabsTrigger value="engagement">Engajamento</TabsTrigger>
          <TabsTrigger value="devices">Dispositivos</TabsTrigger>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
        </TabsList>

        <TabsContent value="audience" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Demografia por Gênero e Idade</CardTitle>
                <CardDescription>Distribuição do público detectado</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={demographicData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="age" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="male" fill="hsl(var(--primary))" name="Masculino" />
                    <Bar dataKey="female" fill="hsl(var(--secondary))" name="Feminino" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fluxo de Pessoas por Horário</CardTitle>
                <CardDescription>Detecções ao longo do dia</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={engagementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="attention" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.3}
                      name="Tempo de Atenção (s)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tempo de Atenção vs. Permanência</CardTitle>
              <CardDescription>Métricas de engajamento por horário</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="attention" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Tempo de Atenção (s)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="dwell" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    name="Tempo de Permanência (s)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {devicePerformance.map((device, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle>{device.device}</CardTitle>
                  <CardDescription>Performance do dispositivo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Visualizações</span>
                    <span className="text-lg font-bold text-primary">{device.views.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Taxa de Engajamento</span>
                    <span className="text-lg font-bold text-primary">{device.engagement}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${device.engagement}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {contentData.map((content, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{content.name}</h3>
                      <p className="text-sm text-muted-foreground">Análise de performance</p>
                    </div>
                    <div className="flex space-x-8">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{content.views.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Visualizações</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{content.clicks}</div>
                        <div className="text-xs text-muted-foreground">Interações</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{content.ctr}%</div>
                        <div className="text-xs text-muted-foreground">CTR</div>
                      </div>
                    </div>
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

export default Analytics;
