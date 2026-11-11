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
    const registration = await this.registration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }

    new Notification(title, options);
  }

  /**
   * Shows a notification at `timestamp` even if the page is frozen by then. Does nothing where the
   * browser has no notification triggers. `isStillWanted` is asked once the registration has been
   * read, so a caller whose reason to notify went away in the meantime schedules nothing.
   */
  async schedule(
    title: string,
    options: NotificationOptions,
    timestamp: number,
    isStillWanted: () => boolean = () => true,
  ): Promise<void> {
    if (!this.isSupported || Notification.permission !== 'granted' || !('showTrigger' in Notification.prototype)) {
      return;
    }

    const registration = await this.registration();
    if (registration && isStillWanted()) {
      await registration.showNotification(title, {
        ...options,
        showTrigger: new TimestampTrigger(timestamp),
      } as NotificationOptions);
    }
  }

  /** Closes the notifications shown through the service worker registration. */
  async closeAll(): Promise<void> {
    if (!this.isSupported) {
      return;
    }

    const registration = await this.registration();
    if (registration?.getNotifications) {
      for (const notification of await registration.getNotifications()) {
        notification.close();
      }
    }
  }

  private async registration(): Promise<ServiceWorkerRegistration | undefined> {
    return 'serviceWorker' in navigator ? navigator.serviceWorker.getRegistration() : undefined;
  }
}
