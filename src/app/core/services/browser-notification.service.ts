import { Service } from '@angular/core';

@Service()
export class BrowserNotificationService {
  get isSupported(): boolean {
    return 'Notification' in window;
  }

  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.error('Error requesting notification permission', e);
      return false;
    }
  }

  async show(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return;
    }

    // Chrome on Android has no Notification constructor ("Illegal constructor"): a page there can
    // only show a notification through its service worker registration.
    const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }

    new Notification(title, options);
  }
}
