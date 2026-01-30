import { useCallback, useRef, useEffect, useState } from 'react';

interface PreloadedMedia {
  id: string;
  blobUrl: string;
  type: string;
  loaded: boolean;
}

interface PreloadProgress {
  total: number;
  loaded: number;
  current: string | null;
  isComplete: boolean;
}

/**
 * Hook para pré-carregar mídias e garantir transições suaves
 * Otimizado para WebView em dispositivos Android (Kodular)
 */
export const useMediaPreloader = () => {
  const preloadedRef = useRef<Map<string, PreloadedMedia>>(new Map());
  const imagePreloadRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const videoPreloadRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [progress, setProgress] = useState<PreloadProgress>({
    total: 0,
    loaded: 0,
    current: null,
    isComplete: false,
  });

  // Abre ou cria banco IndexedDB para cache persistente
  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('MediaPreloadCache', 2);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('media')) {
          const store = db.createObjectStore('media', { keyPath: 'id' });
          store.createIndex('by_cached_at', 'cached_at');
        }
      };
    });
  }, []);

  // Salva blob no IndexedDB
  const saveToCache = useCallback(async (id: string, blob: Blob, type: string) => {
    try {
      const db = await openDB();
      const tx = db.transaction('media', 'readwrite');
      const store = tx.objectStore('media');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          id,
          blob,
          type,
          cached_at: Date.now(),
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      db.close();
    } catch (e) {
      console.warn('Erro ao salvar no cache:', e);
    }
  }, [openDB]);

  // Carrega blob do IndexedDB
  const loadFromCache = useCallback(async (id: string): Promise<{ blob: Blob; type: string } | null> => {
    try {
      const db = await openDB();
      const tx = db.transaction('media', 'readonly');
      const store = tx.objectStore('media');
      
      const result = await new Promise<{ blob: Blob; type: string } | null>((resolve) => {
        const request = store.get(id);
        request.onsuccess = () => {
          if (request.result) {
            resolve({ blob: request.result.blob, type: request.result.type });
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
      
      db.close();
      return result;
    } catch (e) {
      return null;
    }
  }, [openDB]);

  // Limpa cache antigo (mais de 7 dias)
  const cleanOldCache = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction('media', 'readwrite');
      const store = tx.objectStore('media');
      const index = store.index('by_cached_at');
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      
      const range = IDBKeyRange.upperBound(cutoff);
      const cursor = await new Promise<IDBCursorWithValue | null>((resolve) => {
        const request = index.openCursor(range);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
      });
      
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
      
      db.close();
    } catch (e) {
      console.warn('Erro ao limpar cache antigo:', e);
    }
  }, [openDB]);

  // Pré-carrega uma única mídia
  const preloadSingle = useCallback(async (
    id: string,
    url: string,
    type: string
  ): Promise<PreloadedMedia | null> => {
    // Verifica se já está em cache de memória
    const existing = preloadedRef.current.get(id);
    if (existing?.loaded) {
      return existing;
    }

    try {
      // Primeiro tenta carregar do IndexedDB
      const cached = await loadFromCache(id);
      if (cached) {
        const blobUrl = URL.createObjectURL(cached.blob);
        const media: PreloadedMedia = { id, blobUrl, type: cached.type, loaded: true };
        preloadedRef.current.set(id, media);
        
        // Pré-carrega no DOM para transição instantânea
        if (type.includes('video')) {
          const video = document.createElement('video');
          video.preload = 'auto';
          video.src = blobUrl;
          video.load();
          videoPreloadRef.current.set(id, video);
        } else {
          const img = new Image();
          img.src = blobUrl;
          imagePreloadRef.current.set(id, img);
        }
        
        return media;
      }

      // Se não está em cache, baixa da rede
      const response = await fetch(url, { 
        mode: 'cors',
        cache: 'force-cache',
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Salva no IndexedDB para persistência
      await saveToCache(id, blob, type);
      
      const media: PreloadedMedia = { id, blobUrl, type, loaded: true };
      preloadedRef.current.set(id, media);
      
      // Pré-carrega no DOM
      if (type.includes('video')) {
        const video = document.createElement('video');
        video.preload = 'auto';
        video.src = blobUrl;
        video.muted = true;
        video.load();
        videoPreloadRef.current.set(id, video);
      } else {
        const img = new Image();
        img.src = blobUrl;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
        imagePreloadRef.current.set(id, img);
      }
      
      return media;
    } catch (e) {
      console.error(`Erro ao pré-carregar ${id}:`, e);
      return null;
    }
  }, [loadFromCache, saveToCache]);

  // Pré-carrega múltiplas mídias
  const preloadAll = useCallback(async (
    items: Array<{ id: string; url: string; type: string; name: string }>
  ) => {
    setProgress({ total: items.length, loaded: 0, current: null, isComplete: false });
    
    // Limpa cache antigo em background
    cleanOldCache();
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setProgress(prev => ({ ...prev, loaded: i, current: item.name }));
      
      await preloadSingle(item.id, item.url, item.type);
    }
    
    setProgress({ total: items.length, loaded: items.length, current: null, isComplete: true });
  }, [preloadSingle, cleanOldCache]);

  // Pré-carrega próximos N itens (para transição suave)
  const preloadNext = useCallback(async (
    items: Array<{ id: string; url: string; type: string; name: string }>,
    currentIndex: number,
    count: number = 2
  ) => {
    const nextItems: Array<{ id: string; url: string; type: string; name: string }> = [];
    
    for (let i = 1; i <= count; i++) {
      const nextIndex = (currentIndex + i) % items.length;
      const item = items[nextIndex];
      if (item && !preloadedRef.current.get(item.id)?.loaded) {
        nextItems.push(item);
      }
    }
    
    // Pré-carrega em paralelo
    await Promise.all(nextItems.map(item => 
      preloadSingle(item.id, item.url, item.type)
    ));
  }, [preloadSingle]);

  // Obtém URL blob de uma mídia pré-carregada
  const getPreloadedUrl = useCallback((id: string, fallbackUrl: string): string => {
    const preloaded = preloadedRef.current.get(id);
    return preloaded?.blobUrl || fallbackUrl;
  }, []);

  // Verifica se mídia está pré-carregada
  const isPreloaded = useCallback((id: string): boolean => {
    return preloadedRef.current.get(id)?.loaded || false;
  }, []);

  // Obtém elemento de imagem pré-carregado
  const getPreloadedImage = useCallback((id: string): HTMLImageElement | undefined => {
    return imagePreloadRef.current.get(id);
  }, []);

  // Obtém elemento de vídeo pré-carregado
  const getPreloadedVideo = useCallback((id: string): HTMLVideoElement | undefined => {
    return videoPreloadRef.current.get(id);
  }, []);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      // Revoga todas as blob URLs
      preloadedRef.current.forEach(media => {
        URL.revokeObjectURL(media.blobUrl);
      });
      preloadedRef.current.clear();
      imagePreloadRef.current.clear();
      videoPreloadRef.current.clear();
    };
  }, []);

  return {
    preloadAll,
    preloadNext,
    preloadSingle,
    getPreloadedUrl,
    isPreloaded,
    getPreloadedImage,
    getPreloadedVideo,
    progress,
  };
};
