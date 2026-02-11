import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOnlineStatus';
import { 
  cacheData, 
  getCachedData, 
  addToSyncQueue 
} from '@/lib/db';

interface UseOfflineDataOptions {
  cacheKey: string;
  cacheDuration?: number; // in milliseconds
}

export function useOfflineData<T>(options: UseOfflineDataOptions) {
  const { isOnline } = useOnlineStatus();
  const { cacheKey, cacheDuration } = options;

  // Fetch data with offline fallback
  const fetchWithCache = useCallback(async (
    fetcher: () => Promise<{ data: T | null; error: Error | null }>
  ): Promise<{ data: T | null; error: Error | null; fromCache: boolean }> => {
    // If online, try to fetch fresh data
    if (isOnline) {
      try {
        const result = await fetcher();
        
        if (result.data && !result.error) {
          // Cache the fresh data
          await cacheData(cacheKey, result.data, cacheDuration);
          return { ...result, fromCache: false };
        }
        
        // If fetch failed, try cache
        const cached = await getCachedData<T>(cacheKey);
        if (cached) {
          return { data: cached, error: null, fromCache: true };
        }
        
        return { ...result, fromCache: false };
      } catch (error) {
        // Network error, try cache
        const cached = await getCachedData<T>(cacheKey);
        if (cached) {
          return { data: cached, error: null, fromCache: true };
        }
        return { data: null, error: error as Error, fromCache: false };
      }
    }

    // If offline, use cache
    const cached = await getCachedData<T>(cacheKey);
    if (cached) {
      return { data: cached, error: null, fromCache: true };
    }
    
    return { 
      data: null, 
      error: new Error('Sem conexão e sem dados em cache'), 
      fromCache: false 
    };
  }, [isOnline, cacheKey, cacheDuration]);

  // Mutation with offline queue
  const mutateWithQueue = useCallback(async (
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: Record<string, unknown>,
    mutator?: () => Promise<{ data: unknown; error: Error | null }>
  ): Promise<{ success: boolean; queued: boolean; error?: Error }> => {
    if (isOnline && mutator) {
      try {
        const result = await mutator();
        if (result.error) {
          throw result.error;
        }
        return { success: true, queued: false };
      } catch (error) {
        // If mutation failed due to network, queue it
        if ((error as Error).message?.includes('network') || 
            (error as Error).message?.includes('fetch')) {
          await addToSyncQueue(table, operation, data);
          return { success: false, queued: true };
        }
        return { success: false, queued: false, error: error as Error };
      }
    }

    // If offline, add to queue
    await addToSyncQueue(table, operation, data);
    return { success: false, queued: true };
  }, [isOnline]);

  return {
    isOnline,
    fetchWithCache,
    mutateWithQueue,
  };
}

// Generic hook for Supabase queries with offline support
export function useSupabaseOffline<T>(
  table: string,
  options?: {
    select?: string;
    filter?: Record<string, unknown>;
    cacheDuration?: number;
  }
) {
  const select = options?.select || '*';
  const cacheKey = `supabase:${table}:${select}:${JSON.stringify(options?.filter || {})}`;
  
  const { isOnline, fetchWithCache, mutateWithQueue } = useOfflineData<T>({
    cacheKey,
    cacheDuration: options?.cacheDuration,
  });

  const fetch = useCallback(async () => {
    return fetchWithCache(async () => {
      // Use raw query to avoid type issues with dynamic table names
      const { data, error } = await supabase
        .from(table as 'playlists')
        .select(select);
      
      return { 
        data: data as T | null, 
        error: error as Error | null 
      };
    });
  }, [fetchWithCache, table, select]);

  const insert = useCallback(async (data: Record<string, unknown>) => {
    return mutateWithQueue(table, 'insert', data, async () => {
      const { data: result, error } = await supabase
        .from(table as 'playlists')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(data as any)
        .select();
      return { data: result, error: error as Error | null };
    });
  }, [mutateWithQueue, table]);

  const update = useCallback(async (id: string, data: Record<string, unknown>) => {
    return mutateWithQueue(table, 'update', { id, ...data }, async () => {
      const { data: result, error } = await supabase
        .from(table as 'playlists')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(data as any)
        .eq('id', id)
        .select();
      return { data: result, error: error as Error | null };
    });
  }, [mutateWithQueue, table]);

  const remove = useCallback(async (id: string) => {
    return mutateWithQueue(table, 'delete', { id }, async () => {
      const { error } = await supabase
        .from(table as 'playlists')
        .delete()
        .eq('id', id);
      return { data: null, error: error as Error | null };
    });
  }, [mutateWithQueue, table]);

  return {
    isOnline,
    fetch,
    insert,
    update,
    remove,
  };
}
