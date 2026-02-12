export class IndexedDBAdapter {
  private dbName = "PlayerMediaCache";
  private storeName = "media";

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
    });
  }

  async saveMedia(id: string, blob: Blob): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const request = store.put({ id, blob, cached_at: Date.now() });
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMedia(id: string): Promise<Blob | null> {
    try {
      const db = await this.openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const request = store.get(id);
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.blob);
          } else {
            resolve(null);
          }
        };
        request.onerror = () => resolve(null);
      });
    } catch (e) {
      console.error("IndexedDB Error:", e);
      return null;
    }
  }

  async clear(): Promise<void> {
    const deleteRequest = indexedDB.deleteDatabase(this.dbName);
    return new Promise((resolve, reject) => {
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
      deleteRequest.onblocked = () => resolve();
    });
  }
}
