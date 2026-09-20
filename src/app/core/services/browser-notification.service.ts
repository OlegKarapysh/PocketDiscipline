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

  show(title: string, options?: NotificationOptions): void {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return;
    }

    new Notification(title, options);
  }
}
