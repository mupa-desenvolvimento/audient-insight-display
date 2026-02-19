import { Capacitor } from '@capacitor/core';
import { MediaCacheService } from '@/services/mediaCache';

// IndexedDB configuration
const DB_NAME = "PlayerMediaCache";
const STORE_NAME = "media";
const DB_VERSION = 1;

export interface StorageItem {
  id: string;
  blob?: Blob;
  url?: string; // Local URL (filesystem or blob URL)
  cached_at: number;
}

export class OfflineStorageService {
  private mediaCache = new Map<string, string>();
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {
    this.init();
  }

  async init() {
    if (!Capacitor.isNativePlatform()) {
      this.dbPromise = this.openDB();
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
    });
  }

  async getMediaUrl(mediaId: string, remoteUrl: string): Promise<string> {
    // 1. Check in-memory cache
    if (this.mediaCache.has(mediaId)) {
      return this.mediaCache.get(mediaId)!;
    }

    // 2. Native: Check Filesystem
    if (Capacitor.isNativePlatform()) {
      try {
        const cachedUrl = await MediaCacheService.isCached(remoteUrl);
        if (cachedUrl) {
          this.mediaCache.set(mediaId, cachedUrl);
          return cachedUrl;
        }
        
        // Not cached, download it
        const localUrl = await MediaCacheService.downloadFile(remoteUrl);
        if (localUrl) {
          this.mediaCache.set(mediaId, localUrl);
          return localUrl;
        }
      } catch (e) {
        console.error(`[OfflineStorage] Native error for ${mediaId}:`, e);
      }
      return remoteUrl; // Fallback
    }

    // 3. Web: Check IndexedDB
    try {
      const blobUrl = await this.loadFromIndexedDB(mediaId);
      if (blobUrl) {
        this.mediaCache.set(mediaId, blobUrl);
        return blobUrl;
      }

      // Not cached, fetch and save
      const response = await fetch(remoteUrl);
      const blob = await response.blob();
      const newBlobUrl = URL.createObjectURL(blob);
      
      await this.saveToIndexedDB(mediaId, blob);
      this.mediaCache.set(mediaId, newBlobUrl);
      
      return newBlobUrl;
    } catch (e) {
      console.error(`[OfflineStorage] Web error for ${mediaId}:`, e);
      return remoteUrl; // Fallback
    }
  }

  private async saveToIndexedDB(id: string, blob: Blob) {
    try {
      const db = await this.dbPromise;
      if (!db) return;
      
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({ id, blob, cached_at: Date.now() });
    } catch (e) {
      console.error("[OfflineStorage] Save to IDB failed:", e);
    }
  }

  private async loadFromIndexedDB(id: string): Promise<string | null> {
    try {
      const db = await this.dbPromise;
      if (!db) return null;

      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      return new Promise((resolve) => {
        request.onsuccess = () => {
          if (request.result) {
            resolve(URL.createObjectURL(request.result.blob));
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  }

  async clearCache() {
    this.mediaCache.forEach(url => URL.revokeObjectURL(url));
    this.mediaCache.clear();

    if (Capacitor.isNativePlatform()) {
        // Native clear implementation if needed (usually handled by OS or specific clear command)
    } else {
        try {
            const db = await this.dbPromise;
            if(db) {
                const tx = db.transaction(STORE_NAME, "readwrite");
                tx.objectStore(STORE_NAME).clear();
            }
        } catch(e) {
            console.error("[OfflineStorage] Clear IDB failed:", e);
        }
    }
  }

  saveState(key: string, state: any) {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error("[OfflineStorage] Save state failed:", e);
    }
  }

  loadState(key: string): any | null {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error("[OfflineStorage] Load state failed:", e);
      return null;
    }
  }
}

export const offlineStorage = new OfflineStorageService();
