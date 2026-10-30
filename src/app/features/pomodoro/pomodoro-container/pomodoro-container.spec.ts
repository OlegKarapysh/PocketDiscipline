import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PomodoroContainer } from './pomodoro-container';
import { TimerDisplay } from '../components/timer-display/timer-display';
import { TimerControls } from '../components/timer-controls/timer-controls';
import { SessionConfig } from '../components/session-config/session-config';
import { SectionCard } from '../../../shared/components/section-card/section-card';
import { PomodoroTimerService } from '../services/pomodoro-timer.service';
import { PomodoroStatsService } from '../services/pomodoro-stats.service';
import { ClockService } from '../../../core/services/clock.service';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import type { PomodoroPeriodSummary } from '../models/pomodoro-period-summary.model';
import type { PomodoroTally } from '../models/pomodoro-tally.model';
import { PomodoroHistory } from '../components/pomodoro-history/pomodoro-history';
import type { PeriodFilterValue } from '../../../shared/components/period-filter/period-filter-value.model';

const tally = (pomodoros: number, overrides: Partial<PomodoroTally> = {}): PomodoroTally => ({
  pomodoros,
  byType: { [EngagementType.WORK]: pomodoros, [EngagementType.STUDY]: 0 },
  focusMinutes: pomodoros * 25,
  rewardEarned: pomodoros * 25,
  ...overrides,
});

const summary = (startDate: string, endDate: string, total: PomodoroTally): PomodoroPeriodSummary => ({
  startDate,
  endDate,
  days: [],
  total,
});

describe('PomodoroContainer', () => {
  let fixture: ComponentFixture<PomodoroContainer>;
  let timerServiceMock: {
    isActive: ReturnType<typeof signal<boolean>>;
    isRestoring: ReturnType<typeof signal<boolean>>;
    durationMinutes: ReturnType<typeof signal<number>>;
    engagementType: ReturnType<typeof signal<string>>;
    timeRemaining: ReturnType<typeof signal<number>>;
    reward: ReturnType<typeof signal<number | undefined>>;
    startTimer: ReturnType<typeof vi.fn>;
    stopTimer: ReturnType<typeof vi.fn>;
    setConfig: ReturnType<typeof vi.fn>;
  };
  const today = signal('2026-10-30');
  // One live stream per requested range, so a spec can push a new reading into it.
  let streams: Map<string, BehaviorSubject<PomodoroPeriodSummary>>;
  let statsMock: { getPeriodSummary: ReturnType<typeof vi.fn> };

  const stream = (startDate: string, endDate = startDate) => {
    const key = `${startDate}..${endDate}`;
    let subject = streams.get(key);
    if (!subject) {
      subject = new BehaviorSubject(summary(startDate, endDate, tally(0)));
      streams.set(key, subject);
    }
    return subject;
  };

  const host = () => fixture.nativeElement as HTMLElement;
  const todayText = () => host().querySelector('app-pomodoro-today')?.textContent.replace(/\s+/g, ' ').trim() ?? '';
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  beforeEach(async () => {
    timerServiceMock = {
      isActive: signal(false),
      isRestoring: signal(false),
      durationMinutes: signal(25),
      engagementType: signal(EngagementType.WORK),
      timeRemaining: signal(1500),
      reward: signal<number | undefined>(100),
      startTimer: vi.fn(),
      stopTimer: vi.fn(),
      setConfig: vi.fn(),
    };
    today.set('2026-10-30');
    streams = new Map();
    statsMock = {
      getPeriodSummary: vi.fn((startDate: string, endDate: string) => stream(startDate, endDate)),
    };

    await TestBed.configureTestingModule({
      imports: [PomodoroContainer],
      providers: [
        { provide: PomodoroTimerService, useValue: timerServiceMock },
        { provide: PomodoroStatsService, useValue: statsMock },
        { provide: ClockService, useValue: { today } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PomodoroContainer);
  });

  it('should group the timer, its settings and the start button in the first card below the page header', async () => {
    await settle();

    const cards = fixture.debugElement.queryAll(By.directive(SectionCard));
    const card = cards[0];
    expect(card.query(By.directive(TimerDisplay))).toBeTruthy();
    expect(card.query(By.directive(SessionConfig))).toBeTruthy();
    expect(card.query(By.directive(TimerControls))).toBeTruthy();
    expect(cards.slice(1).flatMap((other) => other.queryAll(By.directive(TimerDisplay)))).toEqual([]);

    // Only layout wrappers stand between the header and the card.
    const header = fixture.debugElement.query(By.css('app-page-header')).nativeElement as HTMLElement;
    const cardElement = card.nativeElement as HTMLElement;
    expect(header.nextElementSibling?.contains(cardElement)).toBe(true);
    expect(cardElement.previousElementSibling).toBeNull();
  });

  it('should render a single page header titled Pomodoro', async () => {
    await settle();

    const headers = fixture.debugElement.queryAll(By.css('app-page-header'));
    expect(headers.length).toBe(1);
    expect((headers[0].nativeElement as HTMLElement).textContent).toContain('Pomodoro');
  });

  describe('Today card', () => {
    it("should show today's tally from the stats service, right below the timer card", async () => {
      stream('2026-10-30').next(summary('2026-10-30', '2026-10-30', tally(3)));
      await settle();

      expect(statsMock.getPeriodSummary).toHaveBeenCalledWith('2026-10-30', '2026-10-30');
      expect(todayText()).toContain('3 pomodoros');
      const timerCard = fixture.debugElement.queryAll(By.directive(SectionCard))[0].nativeElement as HTMLElement;
      expect(timerCard.nextElementSibling?.tagName).toBe('APP-POMODORO-TODAY');
    });

    it('should count a session that completes while the page is open', async () => {
      await settle();
      expect(todayText()).toContain('0 pomodoros');

      stream('2026-10-30').next(summary('2026-10-30', '2026-10-30', tally(1)));
      await settle();

      expect(todayText()).toContain('1 pomodoro');
    });

    it('should switch to the new day when the date changes', async () => {
      stream('2026-10-30').next(summary('2026-10-30', '2026-10-30', tally(5)));
      await settle();
      expect(todayText()).toContain('5 pomodoros');

      today.set('2026-10-31');
      await settle();

      expect(statsMock.getPeriodSummary).toHaveBeenCalledWith('2026-10-31', '2026-10-31');
      expect(todayText()).toContain('0 pomodoros');
      // The previous day's stream no longer reaches the card.
      stream('2026-10-30').next(summary('2026-10-30', '2026-10-30', tally(6)));
      await settle();
      expect(todayText()).toContain('0 pomodoros');
    });

    it('should stay visible while a session runs', async () => {
      timerServiceMock.isActive.set(true);
      await settle();

      expect(host().querySelector('app-pomodoro-today')).not.toBeNull();
    });
  });

  describe('History card', () => {
    const historyText = () =>
      host().querySelector('app-pomodoro-history')?.textContent.replace(/\s+/g, ' ').trim() ?? '';
    const chooseFilter = (filter: PeriodFilterValue) => {
      const history = fixture.debugElement.query(By.directive(PomodoroHistory)).componentInstance as PomodoroHistory;
      history.filterChange.emit(filter);
    };
    const historyRanges = () =>
      statsMock.getPeriodSummary.mock.calls
        .map(([startDate, endDate]) => `${String(startDate)}..${String(endDate)}`)
        .filter((range) => range.split('..')[0] !== range.split('..')[1]);

    it('should show the last 7 days, ending today, by default', async () => {
      stream('2026-10-24', '2026-10-30').next(summary('2026-10-24', '2026-10-30', tally(9)));
      await settle();

      expect(statsMock.getPeriodSummary).toHaveBeenCalledWith('2026-10-24', '2026-10-30');
      expect(historyText()).toContain('9 pomodoros');
    });

    it('should sit beside the timer column, not inside it', async () => {
      await settle();

      const history = host().querySelector('app-pomodoro-history');
      const today = host().querySelector('app-pomodoro-today');
      expect(history?.parentElement).toBe(today?.parentElement?.parentElement);
    });

    it('should query the chosen preset or custom range', async () => {
      await settle();

      chooseFilter({ preset: 'last30', startDate: '', endDate: '' });
      await settle();
      expect(statsMock.getPeriodSummary).toHaveBeenLastCalledWith('2026-10-01', '2026-10-30');

      stream('2026-09-01', '2026-09-15').next(summary('2026-09-01', '2026-09-15', tally(12)));
      chooseFilter({ preset: 'custom', startDate: '2026-09-01', endDate: '2026-09-15' });
      await settle();
      expect(statsMock.getPeriodSummary).toHaveBeenLastCalledWith('2026-09-01', '2026-09-15');
      expect(historyText()).toContain('12 pomodoros');
    });

    it('should move a preset range forward when the day changes', async () => {
      await settle();

      today.set('2026-10-31');
      await settle();

      expect(historyRanges().at(-1)).toBe('2026-10-25..2026-10-31');
    });

    it('should keep a custom range as chosen when the day changes', async () => {
      await settle();
      chooseFilter({ preset: 'custom', startDate: '2026-09-01', endDate: '2026-09-15' });
      await settle();

      today.set('2026-10-31');
      await settle();

      expect(historyRanges().at(-1)).toBe('2026-09-01..2026-09-15');
    });
  });
});
