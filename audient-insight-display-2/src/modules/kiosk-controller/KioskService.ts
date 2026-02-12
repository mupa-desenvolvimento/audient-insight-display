import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import { App } from '@capacitor/app';
import { ScreenOrientation } from '@capacitor/screen-orientation';

export class KioskService {
  private isKioskActive = false;

  async enableKioskMode() {
    if (!Capacitor.isNativePlatform()) return;
    
    this.isKioskActive = true;
    console.log("[Kiosk] Enabling Kiosk Mode");

    try {
      // 1. Hide Status Bar
      await StatusBar.hide();

      // 2. Lock Orientation (Landscape)
      try {
        await ScreenOrientation.lock({ orientation: 'landscape' });
      } catch (e) {
        console.warn("[Kiosk] ScreenOrientation lock failed", e);
      }

      // 3. Disable Back Button (Android)
      await App.removeAllListeners();
      App.addListener('backButton', () => {
        if (this.isKioskActive) {
          console.log("[Kiosk] Back button intercepted");
          // Do nothing, effectively disabling it
        }
      });

    } catch (e) {
      console.error("[Kiosk] Error enabling kiosk mode", e);
    }
  }

  async disableKioskMode() {
    if (!Capacitor.isNativePlatform()) return;
    
    this.isKioskActive = false;
    try {
      await StatusBar.show();
      await ScreenOrientation.unlock();
      await App.removeAllListeners();
    } catch (e) {
      console.error("[Kiosk] Error disabling kiosk mode", e);
    }
  }
}

export const kioskService = new KioskService();
