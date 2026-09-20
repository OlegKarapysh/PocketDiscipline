import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { TimerControls } from './timer-controls';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';

describe('TimerControls', () => {
  let fixture: ComponentFixture<TimerControls>;
  let timerServiceMock: {
    isActive: ReturnType<typeof signal<boolean>>;
    startTimer: ReturnType<typeof vi.fn>;
    stopTimer: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    timerServiceMock = {
      isActive: signal(false),
      startTimer: vi.fn().mockResolvedValue(undefined),
      stopTimer: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [TimerControls],
      providers: [
        { provide: PomodoroTimerService, useValue: timerServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TimerControls);
  });

  it('should render start button when timer is inactive and trigger startTimer on click', async () => {
    timerServiceMock.isActive.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const startBtn = fixture.debugElement.query(By.css('button[aria-label="Start Timer"]'));
    expect(startBtn).toBeTruthy();

    (startBtn.nativeElement as HTMLButtonElement).click();
    expect(timerServiceMock.startTimer).toHaveBeenCalled();
  });

  it('should handle error gracefully when startTimer rejects', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const testError = new Error('Failed to start');
    timerServiceMock.startTimer.mockRejectedValue(testError);

    timerServiceMock.isActive.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const startBtn = fixture.debugElement.query(By.css('button[aria-label="Start Timer"]'));
    (startBtn.nativeElement as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(timerServiceMock.startTimer).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(testError);
    consoleSpy.mockRestore();
  });

  it('should render stop button when timer is active and trigger stopTimer on click', async () => {
    timerServiceMock.isActive.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const stopBtn = fixture.debugElement.query(By.css('button[aria-label="Stop Timer"]'));
    expect(stopBtn).toBeTruthy();

    (stopBtn.nativeElement as HTMLButtonElement).click();
    expect(timerServiceMock.stopTimer).toHaveBeenCalled();
  });

  it('should handle error gracefully when stopTimer rejects', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const testError = new Error('Failed to stop');
    timerServiceMock.stopTimer.mockRejectedValue(testError);

    timerServiceMock.isActive.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const stopBtn = fixture.debugElement.query(By.css('button[aria-label="Stop Timer"]'));
    (stopBtn.nativeElement as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(timerServiceMock.stopTimer).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(testError);
    consoleSpy.mockRestore();
  });
});

