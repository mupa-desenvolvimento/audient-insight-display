import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  Users, 
  UserCheck, 
  UserX, 
  Calendar, 
  Trophy,
  Trash2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useAttentionHistory } from "@/hooks/useAttentionHistory";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AttentionHistory = () => {
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  
  const {
    attentionRecords,
    getTodayRecords,
    getDailySummary,
    getUniqueDates,
    getTopAttentionGetters,
    clearHistory,
    formatDuration,
    totalRecords
  } = useAttentionHistory();

  const todayRecords = getTodayRecords();
  const todaySummary = getDailySummary();
  const uniqueDates = getUniqueDates();
  const topGetters = getTopAttentionGetters(selectedDate, 5);

  const toggleDateExpanded = (date: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const getRecordsForDate = (date: string) => {
    return attentionRecords.filter(r => r.date === date);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5 text-primary" />
          Histórico de Atenção
        </CardTitle>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limpar histórico?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá remover todos os {totalRecords} registros de atenção. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={clearHistory} className="bg-destructive text-destructive-foreground">
                Limpar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="today" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">Hoje</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          {/* Today Tab */}
          <TabsContent value="today" className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-primary">
                  {formatDuration(todaySummary.totalDuration)}
                </div>
                <div className="text-xs text-muted-foreground">Tempo Total</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-foreground">
                  {todaySummary.recordCount}
                </div>
                <div className="text-xs text-muted-foreground">Sessões</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-500">
                  {todaySummary.registeredCount}
                </div>
                <div className="text-xs text-muted-foreground">Cadastradas</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {todaySummary.unregisteredCount}
                </div>
                <div className="text-xs text-muted-foreground">Desconhecidas</div>
              </div>
            </div>

            {/* Today's Records */}
            <ScrollArea className="h-48">
              {todayRecords.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum registro hoje
                </div>
              ) : (
                <div className="space-y-2">
                  {todayRecords.slice(0, 20).map((record) => (
                    <div 
                      key={record.id}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {record.isRegistered ? (
                          <UserCheck className="w-4 h-4 text-green-500" />
                        ) : (
                          <UserX className="w-4 h-4 text-orange-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium">
                            {record.personName || `${record.gender}, ${record.age} anos`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {record.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-600">
                        {formatDuration(record.duration)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Ranking Tab */}
          <TabsContent value="ranking" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span className="font-medium">Top 5 - Maior Tempo de Atenção</span>
            </div>

            {topGetters.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Nenhum registro encontrado
              </div>
            ) : (
              <div className="space-y-2">
                {topGetters.map((getter, index) => (
                  <div 
                    key={getter.key}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500 text-yellow-950' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-400 text-orange-950' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">
                          {getter.personName || `${getter.gender}, ${getter.age} anos`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getter.sessions} {getter.sessions === 1 ? 'sessão' : 'sessões'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="bg-primary/20 text-primary">
                        {formatDuration(getter.totalDuration)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <ScrollArea className="h-64">
              {uniqueDates.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum histórico disponível
                </div>
              ) : (
                <div className="space-y-2">
                  {uniqueDates.map((date) => {
                    const summary = getDailySummary(date);
                    const isExpanded = expandedDates.has(date);
                    const dateRecords = getRecordsForDate(date);
                    
                    return (
                      <div key={date} className="border border-border rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleDateExpanded(date)}
                          className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="font-medium">
                              {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short'
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {summary.recordCount} sessões
                            </Badge>
                            <Badge variant="secondary" className="bg-primary/20 text-primary">
                              {formatDuration(summary.totalDuration)}
                            </Badge>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </div>
                        </button>
                        
                        {isExpanded && (
                          <div className="p-3 space-y-2 bg-background/50">
                            {dateRecords.slice(0, 10).map((record) => (
                              <div 
                                key={record.id}
                                className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  {record.isRegistered ? (
                                    <UserCheck className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <UserX className="w-3 h-3 text-orange-500" />
                                  )}
                                  <span>
                                    {record.personName || `${record.gender}, ${record.age} anos`}
                                  </span>
                                </div>
                                <span className="text-muted-foreground">
                                  {formatDuration(record.duration)}
                                </span>
                              </div>
                            ))}
                            {dateRecords.length > 10 && (
                              <div className="text-xs text-muted-foreground text-center">
                                +{dateRecords.length - 10} mais registros
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AttentionHistory;
