import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export class NativeStorageAdapter {
  private cacheFolder = 'media-cache';

  async init(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await Filesystem.mkdir({
        path: this.cacheFolder,
        directory: Directory.Data,
        recursive: true
      });
    } catch (e) {
      console.warn('Cache directory might already exist', e);
    }
  }

  private getFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.substring(pathname.lastIndexOf('/') + 1) || `file_${Date.now()}`;
    } catch {
      return `file_${Date.now()}`;
    }
  }

  async saveMedia(url: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) return null;

    const fileName = this.getFileName(url);
    const path = `${this.cacheFolder}/${fileName}`;

    try {
      // Check if exists first
      try {
        const stat = await Filesystem.stat({
          path: path,
          directory: Directory.Data
        });
        return Capacitor.convertFileSrc(stat.uri);
      } catch {
        // Not found, continue to download
      }

      const response = await fetch(url);
      const blob = await response.blob();
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
            const base64 = reader.result as string;
            // Remove header (data:image/jpeg;base64,)
            const base64Content = base64.split(',')[1];
            resolve(base64Content);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      await Filesystem.writeFile({
        path: path,
        data: base64Data,
        directory: Directory.Data,
        recursive: true
      });

      const uri = await Filesystem.getUri({
        path: path,
        directory: Directory.Data
      });

      return Capacitor.convertFileSrc(uri.uri);
    } catch (e) {
      console.error(`[NativeStorage] Error saving media ${url}:`, e);
      return null;
    }
  }

  async getMedia(url: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) return null;
    
    const fileName = this.getFileName(url);
    const path = `${this.cacheFolder}/${fileName}`;

    try {
      const stat = await Filesystem.stat({
        path: path,
        directory: Directory.Data
      });
      return Capacitor.convertFileSrc(stat.uri);
    } catch {
      return null;
    }
  }
}
