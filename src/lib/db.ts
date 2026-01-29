import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CacheEntry {
  key: string;
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

interface MupaMidiasDB extends DBSchema {
  cache: {
    key: string;
    value: CacheEntry;
    indexes: { 'by-expires': number };
  };
  mediaQueue: {
    key: string;
    value: {
      id: string;
      url: string;
      type: string;
      blob?: Blob;
      status: 'pending' | 'downloading' | 'cached' | 'error';
      createdAt: number;
    };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      table: string;
      operation: 'insert' | 'update' | 'delete';
      data: unknown;
      createdAt: number;
      retries: number;
    };
  };
}

const DB_NAME = 'mupa-midias-db';
const DB_VERSION = 1;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour default

let dbInstance: IDBPDatabase<MupaMidiasDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<MupaMidiasDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<MupaMidiasDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Cache store for API responses
      if (!db.objectStoreNames.contains('cache')) {
        const cacheStore = db.createObjectStore('cache', { keyPath: 'key' });
        cacheStore.createIndex('by-expires', 'expiresAt');
      }

      // Media download queue
      if (!db.objectStoreNames.contains('mediaQueue')) {
        db.createObjectStore('mediaQueue', { keyPath: 'id' });
      }

      // Sync queue for offline mutations
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

// Cache API responses
export async function cacheData(
  key: string,
  data: unknown,
  duration: number = CACHE_DURATION
): Promise<void> {
  const db = await getDB();
  const now = Date.now();
  
  await db.put('cache', {
    key,
    data,
    timestamp: now,
    expiresAt: now + duration,
  });
}

// Get cached data
export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await getDB();
  const entry = await db.get('cache', key);
  
  if (!entry) return null;
  
  // Check if expired
  if (Date.now() > entry.expiresAt) {
    await db.delete('cache', key);
    return null;
  }
  
  return entry.data as T;
}

// Clear expired cache entries
export async function clearExpiredCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('cache', 'readwrite');
  const index = tx.store.index('by-expires');
  const now = Date.now();
  
  let cursor = await index.openCursor(IDBKeyRange.upperBound(now));
  
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
}

// Add item to sync queue (for offline mutations)
export async function addToSyncQueue(
  table: string,
  operation: 'insert' | 'update' | 'delete',
  data: unknown
): Promise<string> {
  const db = await getDB();
  const id = `${table}-${operation}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await db.put('syncQueue', {
    id,
    table,
    operation,
    data,
    createdAt: Date.now(),
    retries: 0,
  });
  
  return id;
}

// Get all pending sync items
export async function getPendingSyncItems() {
  const db = await getDB();
  return db.getAll('syncQueue');
}

// Remove item from sync queue
export async function removeSyncItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('syncQueue', id);
}

// Update sync item retry count
export async function updateSyncItemRetry(id: string): Promise<void> {
  const db = await getDB();
  const item = await db.get('syncQueue', id);
  
  if (item) {
    item.retries += 1;
    await db.put('syncQueue', item);
  }
}

// Media queue operations
export async function addToMediaQueue(
  id: string,
  url: string,
  type: string
): Promise<void> {
  const db = await getDB();
  
  await db.put('mediaQueue', {
    id,
    url,
    type,
    status: 'pending',
    createdAt: Date.now(),
  });
}

export async function getMediaFromQueue(id: string) {
  const db = await getDB();
  return db.get('mediaQueue', id);
}

export async function updateMediaStatus(
  id: string,
  status: 'pending' | 'downloading' | 'cached' | 'error',
  blob?: Blob
): Promise<void> {
  const db = await getDB();
  const item = await db.get('mediaQueue', id);
  
  if (item) {
    item.status = status;
    if (blob) item.blob = blob;
    await db.put('mediaQueue', item);
  }
}

export async function getPendingMedia() {
  const db = await getDB();
  const all = await db.getAll('mediaQueue');
  return all.filter(item => item.status === 'pending');
}

export async function getCachedMedia() {
  const db = await getDB();
  const all = await db.getAll('mediaQueue');
  return all.filter(item => item.status === 'cached');
}
