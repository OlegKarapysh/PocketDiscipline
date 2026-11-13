import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { Observable } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { EventBusService } from './core/services/event-bus.service';
import { DailyScoreReminderService } from './features/daily-scores/services/daily-score-reminder.service';
import { QuickSpendDialog } from './features/rewards/components/quick-spend-dialog/quick-spend-dialog';

describe('App', () => {
  let reminderSubscriptions: number;
  let dialog: { open: ReturnType<typeof vi.fn> };

  const start = () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(async () => {
    reminderSubscriptions = 0;
    dialog = { open: vi.fn() };
    const reminder$ = new Observable<boolean>(() => {
      reminderSubscriptions++;
    });

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: DailyScoreReminderService, useValue: { scheduleDailyReminder: () => reminder$ } },
        { provide: MatDialog, useValue: dialog },
      ],
    }).compileComponents();
  });

  it('should render the app shell with the routed page inside it', () => {
    const element = start().nativeElement as HTMLElement;

    expect(element.querySelector('app-layout router-outlet')).not.toBeNull();
  });

  it('should start the daily score reminder on startup', () => {
    expect(reminderSubscriptions).toBe(0);

    start();

    expect(reminderSubscriptions).toBe(1);
  });

  it('should open Quick spend when it is requested from anywhere in the app', async () => {
    start();

    TestBed.inject(EventBusService).emit({ type: 'REQUEST_QUICK_SPEND' });

    await vi.waitFor(() => {
      expect(dialog.open).toHaveBeenCalledWith(QuickSpendDialog, expect.anything());
    });
  });
});
