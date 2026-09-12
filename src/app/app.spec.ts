import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { NotificationService } from './core/services/notification.service';

describe('App', () => {
  let notificationServiceMock: {
    scheduleDailyReminder: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    notificationServiceMock = {
      scheduleDailyReminder: vi.fn().mockReturnValue(of(true)),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: NotificationService, useValue: notificationServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should schedule daily reminder on init', async () => {
    const service = TestBed.inject(NotificationService);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(service.scheduleDailyReminder).toHaveBeenCalled();
    const result = await firstValueFrom(service.scheduleDailyReminder());
    expect(result).toBe(true);
  });
});
