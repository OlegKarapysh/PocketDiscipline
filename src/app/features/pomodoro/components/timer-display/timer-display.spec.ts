import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { TimerDisplay } from './timer-display';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';
import { ENGAGEMENT_TYPE } from '../../models/pomodoro-session.model';

const SECONDS_25_MIN = 1500;
const SECONDS_1_MIN_5_SEC = 65;
const SECONDS_5_SEC = 5;
const SECONDS_ZERO = 0;

describe('TimerDisplay', () => {
  let fixture: ComponentFixture<TimerDisplay>;
  let timerServiceMock: {
    isActive: ReturnType<typeof signal<boolean>>;
    engagementType: ReturnType<typeof signal<string>>;
    timeRemaining: ReturnType<typeof signal<number>>;
  };

  beforeEach(async () => {
    timerServiceMock = {
      isActive: signal(false),
      engagementType: signal(ENGAGEMENT_TYPE.WORK),
      timeRemaining: signal(SECONDS_25_MIN),
    };

    await TestBed.configureTestingModule({
      imports: [TimerDisplay],
      providers: [
        { provide: PomodoroTimerService, useValue: timerServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TimerDisplay);
  });

  it('should format 1500 seconds as "25:00" and show "Ready to start" when inactive', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const timeEl = fixture.debugElement.query(By.css('.time'));
    const statusEl = fixture.debugElement.query(By.css('.status'));

    expect(timeEl.nativeElement.textContent.trim()).toBe('25:00');
    expect(statusEl.nativeElement.textContent.trim()).toBe('Ready to start');
  });

  it('should format 65 seconds as "01:05" and show "Focusing on study" when active', async () => {
    timerServiceMock.isActive.set(true);
    timerServiceMock.engagementType.set(ENGAGEMENT_TYPE.STUDY);
    timerServiceMock.timeRemaining.set(SECONDS_1_MIN_5_SEC);

    fixture.detectChanges();
    await fixture.whenStable();

    const timeEl = fixture.debugElement.query(By.css('.time'));
    const statusEl = fixture.debugElement.query(By.css('.status'));

    expect(timeEl.nativeElement.textContent.trim()).toBe('01:05');
    expect(statusEl.nativeElement.textContent.trim()).toBe('Focusing on study');
  });

  it('should format 5 seconds as "00:05" with leading zero padding', async () => {
    timerServiceMock.timeRemaining.set(SECONDS_5_SEC);

    fixture.detectChanges();
    await fixture.whenStable();

    const timeEl = fixture.debugElement.query(By.css('.time'));
    expect(timeEl.nativeElement.textContent.trim()).toBe('00:05');
  });

  it('should format 0 seconds as "00:00"', async () => {
    timerServiceMock.timeRemaining.set(SECONDS_ZERO);

    fixture.detectChanges();
    await fixture.whenStable();

    const timeEl = fixture.debugElement.query(By.css('.time'));
    expect(timeEl.nativeElement.textContent.trim()).toBe('00:00');
  });
});
