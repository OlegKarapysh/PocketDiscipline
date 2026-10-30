import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { EMPTY, of } from 'rxjs';
import { TimerControls } from './timer-controls';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';

describe('TimerControls', () => {
  let fixture: ComponentFixture<TimerControls>;
  let timerServiceMock: {
    isActive: ReturnType<typeof signal<boolean>>;
    isRestoring: ReturnType<typeof signal<boolean>>;
    reward: ReturnType<typeof signal<number | undefined>>;
    startTimer: ReturnType<typeof vi.fn>;
    stopTimer: ReturnType<typeof vi.fn>;
  };
  let confirmServiceMock: { ask: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    timerServiceMock = {
      isActive: signal(false),
      isRestoring: signal(false),
      reward: signal<number | undefined>(100),
      startTimer: vi.fn().mockResolvedValue(undefined),
      stopTimer: vi.fn().mockResolvedValue(undefined),
    };
    confirmServiceMock = { ask: vi.fn().mockReturnValue(of(true)) };

    await TestBed.configureTestingModule({
      imports: [TimerControls],
      providers: [
        { provide: PomodoroTimerService, useValue: timerServiceMock },
        { provide: ConfirmService, useValue: confirmServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TimerControls);
  });

  it('should render start button when timer is inactive and trigger startTimer on click', async () => {
    timerServiceMock.isActive.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const startBtn = fixture.debugElement.query(By.css('button.start'));
    expect(startBtn).toBeTruthy();

    (startBtn.nativeElement as HTMLButtonElement).click();
    expect(timerServiceMock.startTimer).toHaveBeenCalled();
  });

  it('should show on Start the reward the configured session pays, and follow it as it changes', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const startBtn = fixture.debugElement.query(By.css('button.start')).nativeElement as HTMLButtonElement;
    expect(startBtn.textContent).toMatch(/Start\s+\+100\s*₴/);

    timerServiceMock.reward.set(250);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(startBtn.textContent).toMatch(/Start\s+\+250\s*₴/);
  });

  it('should leave the reward off Start until the rates have loaded', async () => {
    timerServiceMock.reward.set(undefined);
    fixture.detectChanges();
    await fixture.whenStable();

    const startBtn = fixture.debugElement.query(By.css('button.start')).nativeElement as HTMLButtonElement;
    expect(startBtn.textContent).not.toContain('₴');
  });

  it('should put Stop in the place of Start while a session runs', async () => {
    timerServiceMock.isActive.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.debugElement.query(By.css('button.start'))).toBeNull();
    expect(fixture.debugElement.queryAll(By.css('button')).length).toBe(1);
  });

  it('should disable Start while the running session is being restored', async () => {
    timerServiceMock.isRestoring.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const startBtn = fixture.debugElement.query(By.css('button.start')).nativeElement as HTMLButtonElement;
    expect(startBtn.disabled).toBe(true);

    timerServiceMock.isRestoring.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(startBtn.disabled).toBe(false);
  });

  it('should handle error gracefully when startTimer rejects', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const testError = new Error('Failed to start');
    timerServiceMock.startTimer.mockRejectedValue(testError);

    timerServiceMock.isActive.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const startBtn = fixture.debugElement.query(By.css('button.start'));
    (startBtn.nativeElement as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(timerServiceMock.startTimer).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(testError);
    consoleSpy.mockRestore();
  });

  it('should keep the session running when stopping is not confirmed', async () => {
    confirmServiceMock.ask.mockReturnValue(EMPTY);
    timerServiceMock.isActive.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const stopBtn = fixture.debugElement.query(By.css('button.stop'));
    (stopBtn.nativeElement as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(confirmServiceMock.ask).toHaveBeenCalledWith(expect.objectContaining({ isDestructive: true }));
    expect(timerServiceMock.stopTimer).not.toHaveBeenCalled();
  });

  it('should render stop button when timer is active and trigger stopTimer once confirmed', async () => {
    timerServiceMock.isActive.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const stopBtn = fixture.debugElement.query(By.css('button.stop'));
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

    const stopBtn = fixture.debugElement.query(By.css('button.stop'));
    (stopBtn.nativeElement as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(timerServiceMock.stopTimer).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(testError);
    consoleSpy.mockRestore();
  });
});
