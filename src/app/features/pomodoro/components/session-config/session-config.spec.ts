import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { SessionConfig } from './session-config';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';
import type { TimerConfig } from '../../models/timer-config.model';
import { EngagementType } from '../../../../core/models/engagement-type.enum';

describe('SessionConfig', () => {
  let fixture: ComponentFixture<SessionConfig>;
  let timerServiceMock: {
    isActive: ReturnType<typeof signal<boolean>>;
    durationMinutes: ReturnType<typeof signal<number>>;
    engagementType: ReturnType<typeof signal<EngagementType>>;
    setConfig: ReturnType<typeof vi.fn<(config: TimerConfig) => void>>;
  };

  const query = (selector: string) => fixture.debugElement.query(By.css(selector));
  const button = (label: string) => query(`button[aria-label="${label}"]`).nativeElement as HTMLButtonElement;
  const toggle = (label: string) => {
    const toggles = fixture.debugElement.queryAll(By.css('[role="radio"]'));
    const match = toggles.find((t) => (t.nativeElement as HTMLElement).textContent.trim() === label);
    if (!match) throw new Error(`No "${label}" option`);
    return match.nativeElement as HTMLButtonElement;
  };
  const render = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    timerServiceMock = {
      isActive: signal(false),
      durationMinutes: signal(25),
      engagementType: signal(EngagementType.WORK),
      setConfig: vi.fn((config: TimerConfig) => {
        timerServiceMock.durationMinutes.set(config.durationMinutes);
        timerServiceMock.engagementType.set(config.engagementType);
      }),
    };

    await TestBed.configureTestingModule({
      imports: [SessionConfig],
      providers: [{ provide: PomodoroTimerService, useValue: timerServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionConfig);
    await render();
  });

  describe('engagement type', () => {
    it('should show every engagement type at once, with the current one selected', () => {
      expect(toggle('Work').getAttribute('aria-checked')).toBe('true');
      expect(toggle('Study').getAttribute('aria-checked')).toBe('false');
    });

    it('should switch to study with one tap, keeping the duration', async () => {
      toggle('Study').click();
      await render();

      expect(timerServiceMock.setConfig).toHaveBeenCalledWith({
        durationMinutes: 25,
        engagementType: EngagementType.STUDY,
      });
    });
  });

  describe('duration', () => {
    it('should show the current duration', () => {
      expect((query('.value').nativeElement as HTMLElement).textContent.trim()).toBe('25 min');
    });

    it('should not touch the timer service before a control is used', () => {
      expect(timerServiceMock.setConfig).not.toHaveBeenCalled();
    });

    it('should add 5 minutes on increase, keeping the engagement type', async () => {
      timerServiceMock.engagementType.set(EngagementType.STUDY);
      button('Increase duration').click();
      await render();

      expect(timerServiceMock.setConfig).toHaveBeenCalledWith({
        durationMinutes: 30,
        engagementType: EngagementType.STUDY,
      });
      expect((query('.value').nativeElement as HTMLElement).textContent.trim()).toBe('30 min');
    });

    it('should take 5 minutes off on decrease', async () => {
      button('Decrease duration').click();
      await render();

      expect(timerServiceMock.setConfig).toHaveBeenCalledWith({
        durationMinutes: 20,
        engagementType: EngagementType.WORK,
      });
    });

    it('should disable increase at 120 minutes and keep decrease enabled', async () => {
      timerServiceMock.durationMinutes.set(120);
      await render();

      expect(button('Increase duration').disabled).toBe(true);
      expect(button('Decrease duration').disabled).toBe(false);
    });

    it('should disable decrease at 15 minutes and keep increase enabled', async () => {
      timerServiceMock.durationMinutes.set(15);
      await render();

      expect(button('Decrease duration').disabled).toBe(true);
      expect(button('Increase duration').disabled).toBe(false);
    });

    it('should step from a length off the 5-minute grid back onto it', async () => {
      timerServiceMock.durationMinutes.set(17);
      await render();

      button('Increase duration').click();
      expect(timerServiceMock.setConfig).toHaveBeenLastCalledWith(expect.objectContaining({ durationMinutes: 20 }));

      timerServiceMock.durationMinutes.set(17);
      button('Decrease duration').click();
      expect(timerServiceMock.setConfig).toHaveBeenLastCalledWith(expect.objectContaining({ durationMinutes: 15 }));
    });

    it('should offer no text input, so no keyboard opens', () => {
      expect(query('input')).toBeNull();
    });
  });

  describe('while a session runs', () => {
    beforeEach(async () => {
      timerServiceMock.engagementType.set(EngagementType.STUDY);
      timerServiceMock.durationMinutes.set(50);
      timerServiceMock.isActive.set(true);
      await render();
    });

    it('should replace the controls with one line naming the session', () => {
      expect(query('app-segmented-control')).toBeNull();
      expect(query('button')).toBeNull();
      expect((query('.summary').nativeElement as HTMLElement).textContent.trim()).toBe('Study · 50 min');
    });

    it('should bring the controls back once the session ends', async () => {
      timerServiceMock.isActive.set(false);
      await render();

      expect(query('.summary')).toBeNull();
      expect(query('app-segmented-control')).toBeTruthy();
    });
  });
});
