import { useState, useEffect, useCallback } from 'react';

export interface DetectionLog {
  id: string;
  personId: string;
  personName: string;
  personCpf: string;
  detectedAt: Date;
  confidence: number;
  sessionId: string; // Para agrupar detecções da mesma sessão
}

interface DetectionSession {
  personId: string;
  startTime: Date;
  lastDetection: Date;
}

const STORAGE_KEY = 'detection_logs';
const SESSION_TIMEOUT = 30000; // 30 segundos para considerar nova sessão

export const useDetectionLog = () => {
  const [detectionLogs, setDetectionLogs] = useState<DetectionLog[]>([]);
  const [activeSessions, setActiveSessions] = useState<Map<string, DetectionSession>>(new Map());

  // Carregar logs do localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const parsed = data.map((log: any) => ({
          ...log,
          detectedAt: new Date(log.detectedAt)
        }));
        setDetectionLogs(parsed);
      } catch (error) {
        console.error('Erro ao carregar logs de detecção:', error);
      }
    }
  }, []);

  // Salvar logs no localStorage
  const saveToStorage = useCallback((logs: DetectionLog[]) => {
    try {
      const serializable = logs.map(log => ({
        ...log,
        detectedAt: log.detectedAt.toISOString()
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('Erro ao salvar logs:', error);
    }
  }, []);

  // Registrar nova detecção
  const logDetection = useCallback((
    personId: string,
    personName: string,
    personCpf: string,
    confidence: number
  ) => {
    const now = new Date();
    const currentSession = activeSessions.get(personId);
    
    // Verificar se é uma nova sessão
    let sessionId: string;
    if (!currentSession || (now.getTime() - currentSession.lastDetection.getTime()) > SESSION_TIMEOUT) {
      // Nova sessão
      sessionId = `session_${personId}_${now.getTime()}`;
      setActiveSessions(prev => new Map(prev.set(personId, {
        personId,
        startTime: now,
        lastDetection: now
      })));

      // Criar novo log apenas para novas sessões
      const newLog: DetectionLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        personId,
        personName,
        personCpf,
        detectedAt: now,
        confidence,
        sessionId
      };

      setDetectionLogs(prev => {
        const updated = [newLog, ...prev];
        // Manter apenas os últimos 100 logs
        const trimmed = updated.slice(0, 100);
        saveToStorage(trimmed);
        return trimmed;
      });

      console.log(`Nova detecção registrada: ${personName} às ${now.toLocaleString()}`);
    } else {
      // Atualizar sessão existente
      setActiveSessions(prev => new Map(prev.set(personId, {
        ...currentSession,
        lastDetection: now
      })));
    }
  }, [activeSessions, saveToStorage]);

  // Limpar sessões expiradas
  useEffect(() => {
    const cleanupSessions = setInterval(() => {
      const now = new Date();
      setActiveSessions(prev => {
        const cleaned = new Map();
        prev.forEach((session, personId) => {
          if ((now.getTime() - session.lastDetection.getTime()) <= SESSION_TIMEOUT) {
            cleaned.set(personId, session);
          }
        });
        return cleaned;
      });
    }, 10000); // Verificar a cada 10 segundos

    return () => clearInterval(cleanupSessions);
  }, []);

  // Obter logs de hoje
  const getTodayLogs = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return detectionLogs.filter(log => 
      log.detectedAt >= today && log.detectedAt < tomorrow
    );
  }, [detectionLogs]);

  // Obter logs por pessoa
  const getLogsByPerson = useCallback((personId: string) => {
    return detectionLogs.filter(log => log.personId === personId);
  }, [detectionLogs]);

  // Limpar todos os logs
  const clearLogs = useCallback(() => {
    setDetectionLogs([]);
    setActiveSessions(new Map());
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Estatísticas
  const getStats = useCallback(() => {
    const todayLogs = getTodayLogs();
    const uniquePeopleToday = new Set(todayLogs.map(log => log.personId)).size;
    const totalDetections = detectionLogs.length;
    const activePeople = activeSessions.size;

    return {
      totalDetections,
      todayDetections: todayLogs.length,
      uniquePeopleToday,
      activePeople,
      totalDays: detectionLogs.length > 0 ? 
        Math.ceil((Date.now() - Math.min(...detectionLogs.map(log => log.detectedAt.getTime()))) / (1000 * 60 * 60 * 24)) + 1 : 0
    };
  }, [detectionLogs, getTodayLogs, activeSessions]);

  return {
    detectionLogs,
    activeSessions,
    logDetection,
    getTodayLogs,
    getLogsByPerson,
    clearLogs,
    getStats,
    totalLogs: detectionLogs.length
  };
};