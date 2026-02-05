import { StatusBar, Style } from '@capacitor/status-bar';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export const setupKioskMode = async () => {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Ocultar Status Bar
    await StatusBar.hide();
    
    // Tentar configurar para Landscape (opcional, dependendo do uso)
    // await ScreenOrientation.lock({ orientation: 'landscape' });

    // Ouvinte para restaurar tela cheia se o app voltar do background
    App.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        await StatusBar.hide();
      }
    });

    console.log('Modo Kiosk configurado');
  } catch (e) {
    console.error('Erro ao configurar modo Kiosk:', e);
  }
};
