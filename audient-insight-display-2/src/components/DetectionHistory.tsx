import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  History, 
  Users, 
  Calendar, 
  Clock, 
  TrendingUp, 
  Trash2,
  Eye,
  Activity
} from 'lucide-react';
import { useDetectionLog } from '@/hooks/useDetectionLog';
import { useToast } from '@/hooks/use-toast';

export const DetectionHistory = () => {
  const { 
    detectionLogs, 
    getTodayLogs, 
    clearLogs, 
    getStats,
    activeSessions
  } = useDetectionLog();
  
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('today');
  
  const stats = getStats();
  const todayLogs = getTodayLogs();

  const handleClearLogs = () => {
    clearLogs();
    toast({
      title: "Histórico limpo",
      description: "Todos os registros de detecção foram removidos",
    });
  };

  const formatCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins} min atrás`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d atrás`;
  };

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.todayDetections}</div>
            <p className="text-xs text-muted-foreground">
              {stats.uniquePeopleToday} pessoa(s) única(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalDetections}</div>
            <p className="text-xs text-muted-foreground">
              Em {stats.totalDays} dia(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas Agora</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activePeople}</div>
            <p className="text-xs text-muted-foreground">
              Sessões ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ações</CardTitle>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearLogs}
              disabled={stats.totalDetections === 0}
              className="w-full"
            >
              Limpar Histórico
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de detecções */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>Histórico de Detecções</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="today">Hoje ({todayLogs.length})</TabsTrigger>
              <TabsTrigger value="all">Todos ({stats.totalDetections})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="today" className="space-y-4">
              <div className="max-h-96 overflow-y-auto space-y-3">
                {todayLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma detecção hoje</p>
                    <p className="text-sm">As detecções aparecerão aqui quando pessoas cadastradas forem identificadas</p>
                  </div>
                ) : (
                  todayLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div>
                          <h4 className="font-medium text-primary">{log.personName}</h4>
                          <p className="text-sm text-muted-foreground">
                            CPF: {formatCPF(log.personCpf)}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {(log.confidence * 100).toFixed(1)}% confiança
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {log.detectedAt.toLocaleTimeString()}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{getTimeAgo(log.detectedAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.detectedAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="all" className="space-y-4">
              <div className="max-h-96 overflow-y-auto space-y-3">
                {detectionLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma detecção registrada</p>
                    <p className="text-sm">O histórico aparecerá aqui quando pessoas cadastradas forem identificadas</p>
                  </div>
                ) : (
                  detectionLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <div>
                          <h4 className="font-medium text-primary">{log.personName}</h4>
                          <p className="text-sm text-muted-foreground">
                            CPF: {formatCPF(log.personCpf)}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {(log.confidence * 100).toFixed(1)}% confiança
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{getTimeAgo(log.detectedAt)}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.detectedAt.toLocaleDateString()} às {log.detectedAt.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};