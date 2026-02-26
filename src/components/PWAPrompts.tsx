import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';

// Dynamically import PWA register only when available (production builds)
function usePWARegister() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    // Only available when VitePWA plugin is active (production)
    import('virtual:pwa-register/react')
      .then((mod) => {
        // Module loaded - but we can't use hooks here, so we handle it differently
        // This approach won't work with hooks. Let's use the imperative API instead.
      })
      .catch(() => {
        console.log('[PWA] Service Worker registration not available in this build mode');
      });
  }, []);

  return { needRefresh, setNeedRefresh, offlineReady, setOfflineReady, updateSW };
}

export function PWAUpdatePrompt() {
  const { toast } = useToast();
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updateServiceWorker = useCallback(async (reloadPage?: boolean) => {
    // Will be set by dynamic import
  }, []);

  useEffect(() => {
    let cancelled = false;
    import('virtual:pwa-register')
      .then((mod) => {
        if (cancelled) return;
        const updateSW = mod.registerSW({
          onNeedRefresh() {
            if (!cancelled) setNeedRefresh(true);
          },
          onOfflineReady() {
            if (!cancelled) setOfflineReady(true);
          },
          onRegistered(registration: any) {
            console.log('[PWA] Service Worker registrado:', registration);
          },
          onRegisterError(error: any) {
            console.error('[PWA] Erro ao registrar Service Worker:', error);
          },
        });
      })
      .catch(() => {
        console.log('[PWA] PWA registration not available in this build mode');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (offlineReady) {
      toast({
        title: "Pronto para uso offline",
        description: "O aplicativo está pronto para funcionar sem internet.",
      });
      setOfflineReady(false);
    }
  }, [offlineReady, toast]);

  useEffect(() => {
    if (needRefresh) {
      toast({
        title: "Atualização disponível",
        description: (
          <div className="flex flex-col gap-2">
            <span>Uma nova versão está disponível.</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  // Reload page to get new version
                  window.location.reload();
                }}
                className="gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Atualizar agora
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setNeedRefresh(false)}
              >
                Depois
              </Button>
            </div>
          </div>
        ),
        duration: 0,
      });
    }
  }, [needRefresh, toast]);

  return null;
}

export function InstallPrompt() {
  const { toast } = useToast();

  useEffect(() => {
    let deferredPrompt: BeforeInstallPromptEvent | null = null;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;

      toast({
        title: "Instalar aplicativo",
        description: (
          <div className="flex flex-col gap-2">
            <span>Instale o MupaMídias para acesso rápido e offline.</span>
            <Button
              size="sm"
              onClick={async () => {
                if (deferredPrompt) {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  console.log('[PWA] Instalação:', outcome);
                  deferredPrompt = null;
                }
              }}
              className="gap-1 w-fit"
            >
              <Download className="w-3 h-3" />
              Instalar
            </Button>
          </div>
        ),
        duration: 10000,
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [toast]);

  return null;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}
