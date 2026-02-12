import { Capacitor } from '@capacitor/core';
import { IndexedDBAdapter } from './adapters/IndexedDBAdapter';
import { NativeStorageAdapter } from './adapters/NativeStorageAdapter';

export class StorageService {
  private indexedDB: IndexedDBAdapter;
  private nativeStorage: NativeStorageAdapter;
  private memoryCache: Map<string, string>;

  constructor() {
    this.indexedDB = new IndexedDBAdapter();
    this.nativeStorage = new NativeStorageAdapter();
    this.memoryCache = new Map();
    
    if (Capacitor.isNativePlatform()) {
      this.nativeStorage.init();
    }
  }

  /**
   * Downloads and caches a file, returning a usable URL (blob: or file://)
   */
  async cacheMedia(url: string, id: string): Promise<string> {
    // Check memory cache first
    if (this.memoryCache.has(id)) {
      return this.memoryCache.get(id)!;
    }

    if (Capacitor.isNativePlatform()) {
      // Native flow
      const localUrl = await this.nativeStorage.saveMedia(url);
      if (localUrl) {
        this.memoryCache.set(id, localUrl);
        return localUrl;
      }
      return url; // Fallback
    } else {
      // Web flow (IndexedDB)
      try {
        // Check DB first
        const existingBlob = await this.indexedDB.getMedia(id);
        if (existingBlob) {
          const blobUrl = URL.createObjectURL(existingBlob);
          this.memoryCache.set(id, blobUrl);
          return blobUrl;
        }

        // Download
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Save
        await this.indexedDB.saveMedia(id, blob);
        
        const blobUrl = URL.createObjectURL(blob);
        this.memoryCache.set(id, blobUrl);
        return blobUrl;
      } catch (e) {
        console.error("StorageService Error:", e);
        return url; // Fallback
      }
    }
  }

  async getCachedMedia(id: string, url: string): Promise<string> {
    if (this.memoryCache.has(id)) {
      return this.memoryCache.get(id)!;
    }

    if (Capacitor.isNativePlatform()) {
      const localUrl = await this.nativeStorage.getMedia(url);
      if (localUrl) {
        this.memoryCache.set(id, localUrl);
        return localUrl;
      }
    } else {
      const blob = await this.indexedDB.getMedia(id);
      if (blob) {
        const blobUrl = URL.createObjectURL(blob);
        this.memoryCache.set(id, blobUrl);
        return blobUrl;
      }
    }

    return url;
  }

  // --- State Persistence (JSON) ---
  
  saveState(key: string, state: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.error("Error saving state:", e);
    }
  }

  loadState<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.error("Error loading state:", e);
    }
    return null;
  }

  async clearAll(): Promise<void> {
    this.memoryCache.forEach(url => URL.revokeObjectURL(url));
    this.memoryCache.clear();
    await this.indexedDB.clear();
    // Native cleanup if needed
  }
}

export const storageService = new StorageService();
