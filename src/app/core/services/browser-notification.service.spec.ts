import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserNotificationService } from './browser-notification.service';

describe('BrowserNotificationService', () => {
  let service: BrowserNotificationService;
  const originalNotification = window.Notification;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [BrowserNotificationService] });
    service = TestBed.inject(BrowserNotificationService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.Notification = originalNotification;
  });

  describe('requestPermission', () => {
    it('should return false if Notification API is not supported in window', async () => {
      Reflect.deleteProperty(window, 'Notification');

      const result = await service.requestPermission();
      expect(result).toBe(false);
    });

    it('should return true if Notification.permission is already granted', async () => {
      vi.stubGlobal('Notification', {
        permission: 'granted',
        requestPermission: vi.fn().mockResolvedValue('granted'),
      });

      const result = await service.requestPermission();
      expect(result).toBe(true);
    });

    it('should request permission if not already denied', async () => {
      const requestPermissionMock = vi.fn().mockResolvedValue('granted');
      vi.stubGlobal('Notification', {
        permission: 'default',
        requestPermission: requestPermissionMock,
      });

      const result = await service.requestPermission();
      expect(requestPermissionMock).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false if requestPermission is denied', async () => {
      const requestPermissionMock = vi.fn().mockResolvedValue('denied');
      vi.stubGlobal('Notification', {
        permission: 'default',
        requestPermission: requestPermissionMock,
      });

      const result = await service.requestPermission();
      expect(result).toBe(false);
    });

    it('should not prompt again once permission is denied', async () => {
      const requestPermissionMock = vi.fn().mockResolvedValue('granted');
      vi.stubGlobal('Notification', {
        permission: 'denied',
        requestPermission: requestPermissionMock,
      });

      const result = await service.requestPermission();
      expect(result).toBe(false);
      expect(requestPermissionMock).not.toHaveBeenCalled();
    });

    it('should return false when requestPermission rejects', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      vi.stubGlobal('Notification', {
        permission: 'default',
        requestPermission: vi.fn().mockRejectedValue(new Error('boom')),
      });

      const result = await service.requestPermission();
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('show', () => {
    it('should show through the service worker registration where the constructor is unavailable', async () => {
      const illegalConstructor = vi.fn(() => {
        throw new TypeError('Illegal constructor');
      });
      Object.assign(illegalConstructor, { permission: 'granted' });
      vi.stubGlobal('Notification', illegalConstructor);
      const showNotification = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', {
        serviceWorker: { getRegistration: vi.fn().mockResolvedValue({ showNotification }) },
      });

      await service.show('Pocket Discipline', { body: 'Hello' });

      expect(showNotification).toHaveBeenCalledWith('Pocket Discipline', { body: 'Hello' });
      expect(illegalConstructor).not.toHaveBeenCalled();
    });

    it('should construct a Notification when there is no service worker registration', async () => {
      const notificationSpy = vi.fn();
      Object.assign(notificationSpy, { permission: 'granted' });
      vi.stubGlobal('Notification', notificationSpy);
      vi.stubGlobal('navigator', { serviceWorker: { getRegistration: vi.fn().mockResolvedValue(undefined) } });

      await service.show('Pocket Discipline', { body: 'Hello' });

      expect(notificationSpy).toHaveBeenCalledWith('Pocket Discipline', { body: 'Hello' });
    });

    it('should not show anything when permission is not granted', async () => {
      const notificationSpy = vi.fn();
      Object.assign(notificationSpy, { permission: 'default' });
      vi.stubGlobal('Notification', notificationSpy);
      const getRegistration = vi.fn();
      vi.stubGlobal('navigator', { serviceWorker: { getRegistration } });

      await service.show('Pocket Discipline', { body: 'Hello' });

      expect(notificationSpy).not.toHaveBeenCalled();
      expect(getRegistration).not.toHaveBeenCalled();
    });

    it('should do nothing when the Notification API is unsupported', async () => {
      Reflect.deleteProperty(window, 'Notification');

      await expect(service.show('Pocket Discipline')).resolves.toBeUndefined();
    });
  });

  describe('schedule', () => {
    const stubTriggers = (permission: NotificationPermission, withTriggers = true) => {
      const notification = vi.fn();
      Object.assign(notification, { permission });
      notification.prototype = withTriggers ? { showTrigger: null } : {};
      vi.stubGlobal('Notification', notification);
      vi.stubGlobal(
        'TimestampTrigger',
        class {
          constructor(readonly timestamp: number) {}
        },
      );
      const showNotification = vi.fn().mockResolvedValue(undefined);
      const getRegistration = vi.fn().mockResolvedValue({ showNotification });
      vi.stubGlobal('navigator', { serviceWorker: { getRegistration } });
      return { showNotification, getRegistration };
    };

    it('should hand the registration a notification triggered at the given time', async () => {
      const { showNotification } = stubTriggers('granted');

      await service.schedule('Pomodoro complete', { body: 'Done' }, 1_700_000_000_000);

      expect(showNotification).toHaveBeenCalledWith('Pomodoro complete', {
        body: 'Done',
        showTrigger: { timestamp: 1_700_000_000_000 },
      });
    });

    it('should schedule nothing when the caller no longer wants it once the registration is read', async () => {
      const { showNotification, getRegistration } = stubTriggers('granted');

      await service.schedule('Pomodoro complete', {}, 1_700_000_000_000, () => false);

      expect(getRegistration).toHaveBeenCalled();
      expect(showNotification).not.toHaveBeenCalled();
    });

    it('should schedule nothing where the browser has no notification triggers', async () => {
      const { showNotification } = stubTriggers('granted', false);

      await service.schedule('Pomodoro complete', {}, 1_700_000_000_000);

      expect(showNotification).not.toHaveBeenCalled();
    });

    it('should schedule nothing when permission is not granted', async () => {
      const { showNotification } = stubTriggers('default');

      await service.schedule('Pomodoro complete', {}, 1_700_000_000_000);

      expect(showNotification).not.toHaveBeenCalled();
    });
  });

  describe('closeAll', () => {
    it('should close every notification of the service worker registration', async () => {
      vi.stubGlobal('Notification', Object.assign(vi.fn(), { permission: 'granted' }));
      const shown = [{ close: vi.fn() }, { close: vi.fn() }];
      vi.stubGlobal('navigator', {
        serviceWorker: {
          getRegistration: vi.fn().mockResolvedValue({ getNotifications: vi.fn().mockResolvedValue(shown) }),
        },
      });

      await service.closeAll();

      expect(shown.map((notification) => notification.close.mock.calls.length)).toEqual([1, 1]);
    });

    it('should do nothing when there is no service worker registration', async () => {
      vi.stubGlobal('Notification', Object.assign(vi.fn(), { permission: 'granted' }));
      vi.stubGlobal('navigator', { serviceWorker: { getRegistration: vi.fn().mockResolvedValue(undefined) } });

      await expect(service.closeAll()).resolves.toBeUndefined();
    });
  });

  describe('isSupported', () => {
    it('should be false when the Notification API is missing', () => {
      Reflect.deleteProperty(window, 'Notification');
      expect(service.isSupported).toBe(false);
    });

    it('should be true when the Notification API is present', () => {
      vi.stubGlobal('Notification', { permission: 'default' });
      expect(service.isSupported).toBe(true);
    });
  });
});
