import { useState, useEffect, useCallback } from 'react';

export interface AttentionRecord {
  id: string;
  trackId: string;
  personId?: string;
  personName?: string;
  isRegistered: boolean;
  gender: 'masculino' | 'feminino' | 'indefinido';
  ageGroup: string;
  age: number;
  startTime: Date;
  endTime: Date;
  duration: number; // in seconds
  date: string; // YYYY-MM-DD for grouping
}

export interface DailyAttentionSummary {
  date: string;
  totalDuration: number;
  recordCount: number;
  averageDuration: number;
  maxDuration: number;
  registeredCount: number;
  unregisteredCount: number;
}

const STORAGE_KEY = 'attention_history';
const MAX_RECORDS = 500;

export const useAttentionHistory = () => {
  const [attentionRecords, setAttentionRecords] = useState<AttentionRecord[]>([]);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const parsed = data.map((record: any) => ({
          ...record,
          startTime: new Date(record.startTime),
          endTime: new Date(record.endTime)
        }));
        setAttentionRecords(parsed);
      } catch (error) {
        console.error('Error loading attention history:', error);
      }
    }
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback((records: AttentionRecord[]) => {
    try {
      const serializable = records.map(record => ({
        ...record,
        startTime: record.startTime.toISOString(),
        endTime: record.endTime.toISOString()
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('Error saving attention history:', error);
    }
  }, []);

  // Add new attention record
  const addAttentionRecord = useCallback((
    trackId: string,
    personId: string | undefined,
    personName: string | undefined,
    isRegistered: boolean,
    gender: 'masculino' | 'feminino' | 'indefinido',
    ageGroup: string,
    age: number,
    startTime: Date,
    endTime: Date,
    duration: number
  ) => {
    // Only save if duration is at least 1 second
    if (duration < 1) return;

    const today = new Date().toISOString().split('T')[0];
    
    const newRecord: AttentionRecord = {
      id: `attention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      trackId,
      personId,
      personName,
      isRegistered,
      gender,
      ageGroup,
      age,
      startTime,
      endTime,
      duration,
      date: today
    };

    setAttentionRecords(prev => {
      const updated = [newRecord, ...prev].slice(0, MAX_RECORDS);
      saveToStorage(updated);
      return updated;
    });

    console.log(`Attention recorded: ${personName || 'Unknown'} - ${duration.toFixed(1)}s`);
  }, [saveToStorage]);

  // Get records for today
  const getTodayRecords = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return attentionRecords.filter(record => record.date === today);
  }, [attentionRecords]);

  // Get records by person
  const getRecordsByPerson = useCallback((personId: string) => {
    return attentionRecords.filter(record => record.personId === personId);
  }, [attentionRecords]);

  // Get daily summary
  const getDailySummary = useCallback((date?: string): DailyAttentionSummary => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const dayRecords = attentionRecords.filter(r => r.date === targetDate);

    if (dayRecords.length === 0) {
      return {
        date: targetDate,
        totalDuration: 0,
        recordCount: 0,
        averageDuration: 0,
        maxDuration: 0,
        registeredCount: 0,
        unregisteredCount: 0
      };
    }

    const totalDuration = dayRecords.reduce((sum, r) => sum + r.duration, 0);
    const maxDuration = Math.max(...dayRecords.map(r => r.duration));
    const registeredCount = dayRecords.filter(r => r.isRegistered).length;
    const unregisteredCount = dayRecords.filter(r => !r.isRegistered).length;

    return {
      date: targetDate,
      totalDuration,
      recordCount: dayRecords.length,
      averageDuration: totalDuration / dayRecords.length,
      maxDuration,
      registeredCount,
      unregisteredCount
    };
  }, [attentionRecords]);

  // Get all unique dates
  const getUniqueDates = useCallback(() => {
    const dates = [...new Set(attentionRecords.map(r => r.date))];
    return dates.sort((a, b) => b.localeCompare(a)); // Most recent first
  }, [attentionRecords]);

  // Get top attention getters for a date
  const getTopAttentionGetters = useCallback((date?: string, limit = 5) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const dayRecords = attentionRecords.filter(r => r.date === targetDate);

    // Group by personId or trackId
    const grouped = new Map<string, { 
      key: string;
      personName: string | undefined;
      isRegistered: boolean;
      gender: string;
      age: number;
      totalDuration: number;
      sessions: number;
    }>();

    dayRecords.forEach(record => {
      const key = record.personId || record.trackId;
      const existing = grouped.get(key);
      
      if (existing) {
        existing.totalDuration += record.duration;
        existing.sessions += 1;
      } else {
        grouped.set(key, {
          key,
          personName: record.personName,
          isRegistered: record.isRegistered,
          gender: record.gender,
          age: record.age,
          totalDuration: record.duration,
          sessions: 1
        });
      }
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, limit);
  }, [attentionRecords]);

  // Clear all records
  const clearHistory = useCallback(() => {
    setAttentionRecords([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Format duration for display
  const formatDuration = useCallback((seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  }, []);

  return {
    attentionRecords,
    addAttentionRecord,
    getTodayRecords,
    getRecordsByPerson,
    getDailySummary,
    getUniqueDates,
    getTopAttentionGetters,
    clearHistory,
    formatDuration,
    totalRecords: attentionRecords.length
  };
};
