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
    it('should construct a Notification with the given title and options when granted', () => {
      const notificationSpy = vi.fn();
      Object.assign(notificationSpy, { permission: 'granted' });
      vi.stubGlobal('Notification', notificationSpy);

      service.show('Pocket Discipline', { body: 'Hello' });

      expect(notificationSpy).toHaveBeenCalledWith('Pocket Discipline', { body: 'Hello' });
    });

    it('should not construct a Notification when permission is not granted', () => {
      const notificationSpy = vi.fn();
      Object.assign(notificationSpy, { permission: 'default' });
      vi.stubGlobal('Notification', notificationSpy);

      service.show('Pocket Discipline', { body: 'Hello' });

      expect(notificationSpy).not.toHaveBeenCalled();
    });

    it('should do nothing when the Notification API is unsupported', () => {
      Reflect.deleteProperty(window, 'Notification');

      expect(() => { service.show('Pocket Discipline'); }).not.toThrow();
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
