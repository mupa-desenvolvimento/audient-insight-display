import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export const CACHE_FOLDER = 'media-cache';

export interface CachedMedia {
  url: string;
  localPath: string;
  timestamp: number;
}

export const MediaCacheService = {
  /**
   * Inicializa o diretório de cache se não existir
   */
  async init() {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await Filesystem.mkdir({
        path: CACHE_FOLDER,
        directory: Directory.Data,
        recursive: true
      });
    } catch (e) {
      console.error('Erro ao criar diretório de cache', e);
    }
  },

  /**
   * Verifica se o arquivo já está em cache e retorna o caminho local
   */
  async isCached(url: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform() || !url) return null;

    const fileName = this.getFileName(url);
    const path = `${CACHE_FOLDER}/${fileName}`;

    try {
      const stat = await Filesystem.stat({
        path: path,
        directory: Directory.Data
      });
      return Capacitor.convertFileSrc(stat.uri);
    } catch {
      return null;
    }
  },

  /**
   * Converte uma URL remota em um caminho local se o arquivo já estiver baixado.
   * Se não estiver, retorna a URL original e inicia o download em background.
   */
  async getLocalUrl(url: string): Promise<string> {
    if (!Capacitor.isNativePlatform() || !url) return url;

    const cachedUrl = await this.isCached(url);
    if (cachedUrl) return cachedUrl;

    // Se não existe, retorna a URL original e inicia download em background
    this.downloadFile(url);
    return url;
  },

  /**
   * Baixa um arquivo e salva no sistema de arquivos local
   */
  async downloadFile(url: string): Promise<string | null> {
    if (!Capacitor.isNativePlatform()) return null;

    const fileName = this.getFileName(url);
    const path = `${CACHE_FOLDER}/${fileName}`;

    try {
      // Download do arquivo
      const response = await fetch(url);
      const blob = await response.blob();
      
      // Converter blob para base64 para salvar via Filesystem
      const base64Data = await this.blobToBase64(blob);
      
      await Filesystem.writeFile({
        path: path,
        data: base64Data,
        directory: Directory.Data,
        recursive: true
      });

      console.log(`Arquivo baixado com sucesso: ${fileName}`);
      
      const uri = await Filesystem.getUri({
        path: path,
        directory: Directory.Data
      });

      return Capacitor.convertFileSrc(uri.uri);
    } catch (e) {
      console.error(`Erro ao baixar arquivo ${url}:`, e);
      return null;
    }
  },

  /**
   * Garante que uma lista de URLs esteja disponível offline
   */
  async cachePlaylist(urls: string[]) {
    if (!Capacitor.isNativePlatform()) return;

    console.log('Iniciando cache da playlist...', urls.length, 'itens');
    const promises = urls.map(url => this.downloadFile(url));
    await Promise.allSettled(promises);
    console.log('Cache da playlist concluído');
    
    // Limpeza de arquivos antigos (opcional, pode ser implementado depois)
    this.cleanupOldFiles(urls);
  },

  /**
   * Remove arquivos que não estão na lista atual (limpeza de cache)
   */
  async cleanupOldFiles(activeUrls: string[]) {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const activeFileNames = activeUrls.map(url => this.getFileName(url));
      
      const result = await Filesystem.readdir({
        path: CACHE_FOLDER,
        directory: Directory.Data
      });

      for (const file of result.files) {
        if (!activeFileNames.includes(file.name)) {
          await Filesystem.deleteFile({
            path: `${CACHE_FOLDER}/${file.name}`,
            directory: Directory.Data
          });
          console.log(`Arquivo removido do cache: ${file.name}`);
        }
      }
    } catch (e) {
      console.error('Erro na limpeza de cache:', e);
    }
  },

  getFileName(url: string): string {
    // Extrai o nome do arquivo da URL ou gera um hash se não for possível
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const name = pathname.substring(pathname.lastIndexOf('/') + 1);
      return name || `file-${this.hashString(url)}`;
    } catch {
      return `file-${this.hashString(url)}`;
    }
  },

  hashString(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  },

  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove o prefixo data:image/png;base64, para salvar apenas os dados
        const base64Data = base64String.split(',')[1] || base64String;
        resolve(base64Data); 
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
};
