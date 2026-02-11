import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';

export function PWAUpdatePrompt() {
  const { toast } = useToast();
  
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('[PWA] Service Worker registrado:', registration);
    },
    onRegisterError(error) {
      console.error('[PWA] Erro ao registrar Service Worker:', error);
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast({
        title: "Pronto para uso offline",
        description: "O aplicativo está pronto para funcionar sem internet.",
      });
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady, toast]);

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
                onClick={() => updateServiceWorker(true)}
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
        duration: 0, // Don't auto-dismiss
      });
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker, toast]);

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
