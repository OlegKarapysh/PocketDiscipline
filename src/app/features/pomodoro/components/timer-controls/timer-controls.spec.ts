import { ComponentFixture, TestBed } from '@angular/core/testing';
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
      startTimer: vi.fn(),
      stopTimer: vi.fn(),
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

    startBtn.nativeElement.click();
    expect(timerServiceMock.startTimer).toHaveBeenCalled();
  });

  it('should render stop button when timer is active and trigger stopTimer on click', async () => {
    timerServiceMock.isActive.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const stopBtn = fixture.debugElement.query(By.css('button[aria-label="Stop Timer"]'));
    expect(stopBtn).toBeTruthy();

    stopBtn.nativeElement.click();
    expect(timerServiceMock.stopTimer).toHaveBeenCalled();
  });
});
