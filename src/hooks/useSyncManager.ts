import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOnlineStatus';
import { 
  getPendingSyncItems, 
  removeSyncItem, 
  updateSyncItemRetry,
  clearExpiredCache 
} from '@/lib/db';
import { useToast } from './use-toast';

const MAX_RETRIES = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

export function useSyncManager() {
  const { isOnline, wasOffline, clearWasOffline } = useOnlineStatus();
  const { toast } = useToast();
  const isSyncing = useRef(false);

  const processSyncQueue = useCallback(async () => {
    if (!isOnline || isSyncing.current) return;
    
    isSyncing.current = true;
    
    try {
      const pendingItems = await getPendingSyncItems();
      
      if (pendingItems.length === 0) {
        isSyncing.current = false;
        return;
      }

      console.log(`[SyncManager] Processando ${pendingItems.length} itens pendentes...`);
      
      let successCount = 0;
      let errorCount = 0;

      for (const item of pendingItems) {
        if (item.retries >= MAX_RETRIES) {
          console.warn(`[SyncManager] Item ${item.id} excedeu tentativas máximas`);
          await removeSyncItem(item.id);
          errorCount++;
          continue;
        }

        try {
          const data = item.data as Record<string, unknown>;
          const tableName = item.table as 'playlists' | 'media_items' | 'devices' | 'channels' | 'stores';
          
          switch (item.operation) {
            case 'insert':
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await supabase.from(tableName).insert(data as any);
              break;
            case 'update':
              if ('id' in data) {
                const { id, ...updateData } = data;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await supabase.from(tableName).update(updateData as any).eq('id', id as string);
              }
              break;
            case 'delete':
              if ('id' in data) {
                await supabase.from(tableName).delete().eq('id', data.id as string);
              }
              break;
          }
          
          await removeSyncItem(item.id);
          successCount++;
          console.log(`[SyncManager] Item ${item.id} sincronizado com sucesso`);
        } catch (error) {
          console.error(`[SyncManager] Erro ao sincronizar item ${item.id}:`, error);
          await updateSyncItemRetry(item.id);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${successCount} alteração(ões) sincronizada(s)`,
        });
      }

      if (errorCount > 0) {
        toast({
          title: "Erros na sincronização",
          description: `${errorCount} item(ns) falharam`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('[SyncManager] Erro geral:', error);
    } finally {
      isSyncing.current = false;
    }
  }, [isOnline, toast]);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      console.log('[SyncManager] Voltou online, iniciando sincronização...');
      processSyncQueue();
      clearWasOffline();
      
      toast({
        title: "Conexão restaurada",
        description: "Sincronizando dados...",
      });
    }
  }, [isOnline, wasOffline, processSyncQueue, clearWasOffline, toast]);

  // Periodic sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline) {
        processSyncQueue();
        clearExpiredCache();
      }
    }, SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [isOnline, processSyncQueue]);

  // Initial sync on mount
  useEffect(() => {
    if (isOnline) {
      processSyncQueue();
    }
  }, []);

  return {
    processSyncQueue,
    isOnline,
  };
}
