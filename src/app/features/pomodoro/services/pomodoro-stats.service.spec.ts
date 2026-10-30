import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { PomodoroStatsService } from './pomodoro-stats.service';
import { DbService } from '../../../database/db.service';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import type { PomodoroTally } from '../models/pomodoro-tally.model';

vi.mock('dexie', () => {
  class MockDexie {
    version = vi.fn();
  }
  return {
    default: MockDexie,
    Dexie: MockDexie,
    liveQuery: (fn: () => unknown) => fn(),
  };
});

// A pomodoroSessions table that answers whichever index it is queried by, so the spec checks the
// counting rule, not how the service narrows the query.
function pomodoroTable(sessions: readonly object[]): { where: ReturnType<typeof vi.fn> } {
  const valueOf = (session: object, index: string): unknown => (session as Record<string, unknown>)[index];
  return {
    where: vi.fn((index: string) => ({
      equals: (value: unknown) => ({
        toArray: () => Promise.resolve(sessions.filter((s) => valueOf(s, index) === value)),
      }),
      between: (lower: number, upper: number) => ({
        toArray: () =>
          Promise.resolve(
            sessions.filter((s) => {
              const v = valueOf(s, index) as number;
              return v >= lower && v <= upper;
            }),
          ),
      }),
      above: (lower: number) => ({
        toArray: () => Promise.resolve(sessions.filter((s) => (valueOf(s, index) as number) > lower)),
      }),
    })),
  };
}

const at = (dateTime: string) => new Date(dateTime).getTime();

let nextId = 0;
const session = (overrides: Partial<PomodoroSession>): PomodoroSession => ({
  id: `session-${String(nextId++)}`,
  durationMinutes: 25,
  engagementType: EngagementType.WORK,
  startTime: at('2026-09-01T10:00:00'),
  endTime: at('2026-09-01T10:25:00'),
  status: PomodoroSessionStatus.COMPLETED,
  rewardEarned: 25,
  ...overrides,
});

const tally = (overrides: Partial<PomodoroTally> = {}): PomodoroTally => ({
  pomodoros: 0,
  byType: { [EngagementType.WORK]: 0, [EngagementType.STUDY]: 0 },
  focusMinutes: 0,
  rewardEarned: 0,
  ...overrides,
});

describe('PomodoroStatsService', () => {
  let service: PomodoroStatsService;
  let dbMock: { pomodoroSessions: { where: ReturnType<typeof vi.fn> } };

  const summaryOf = (sessions: PomodoroSession[], startDate: string, endDate = startDate) => {
    dbMock.pomodoroSessions = pomodoroTable(sessions);
    return firstValueFrom(service.getPeriodSummary(startDate, endDate));
  };

  beforeEach(() => {
    dbMock = { pomodoroSessions: pomodoroTable([]) };

    TestBed.configureTestingModule({
      providers: [PomodoroStatsService, { provide: DbService, useValue: dbMock }],
    });

    service = TestBed.inject(PomodoroStatsService);
  });

  it('should count completed sessions only, not active or cancelled ones', async () => {
    const summary = await summaryOf(
      [
        session({ status: PomodoroSessionStatus.COMPLETED }),
        session({ status: PomodoroSessionStatus.ACTIVE, endTime: undefined }),
        session({ status: PomodoroSessionStatus.CANCELLED }),
      ],
      '2026-09-01',
    );

    expect(summary.total.pomodoros).toBe(1);
  });

  it('should count one pomodoro per session, whatever its duration, split by engagement type', async () => {
    const summary = await summaryOf(
      [
        session({ durationMinutes: 25 }),
        session({ durationMinutes: 25 }),
        session({ durationMinutes: 25 }),
        session({ durationMinutes: 50, engagementType: EngagementType.STUDY }),
      ],
      '2026-09-01',
    );

    expect(summary.total).toEqual(
      tally({ pomodoros: 4, byType: { work: 3, study: 1 }, focusMinutes: 125, rewardEarned: 100 }),
    );
  });

  it('should list every engagement type in the split, at zero too', async () => {
    const summary = await summaryOf([session({ engagementType: EngagementType.STUDY })], '2026-09-01', '2026-09-02');

    expect(summary.days[0].byType).toEqual({ work: 0, study: 1 });
    expect(summary.days[1].byType).toEqual({ work: 0, study: 0 });
  });

  it('should add up the focus minutes and rewards, counting a missing reward as 0', async () => {
    const summary = await summaryOf(
      [session({ durationMinutes: 90, rewardEarned: 120 }), session({ durationMinutes: 15, rewardEarned: undefined })],
      '2026-09-01',
    );

    expect(summary.total).toMatchObject({ pomodoros: 2, focusMinutes: 105, rewardEarned: 120 });
  });

  describe('the day a session counts on', () => {
    it('should be the day of its endTime', async () => {
      const summary = await summaryOf(
        [session({ startTime: at('2026-09-01T09:00:00'), endTime: at('2026-09-02T09:25:00') })],
        '2026-09-01',
        '2026-09-02',
      );

      expect(summary.days.map((day) => day.pomodoros)).toEqual([0, 1]);
    });

    it('should be the day it ended for a session crossing midnight', async () => {
      const summary = await summaryOf(
        [session({ startTime: at('2026-08-31T23:45:00'), endTime: at('2026-09-01T00:10:00') })],
        '2026-08-31',
        '2026-09-01',
      );

      expect(summary.days.map((day) => day.pomodoros)).toEqual([0, 1]);
    });

    it('should be the day of reopening for a session completed two days after it started', async () => {
      const summary = await summaryOf(
        [session({ startTime: at('2026-09-01T22:00:00'), endTime: at('2026-09-03T08:00:00') })],
        '2026-09-03',
      );

      expect(summary.total.pomodoros).toBe(1);
    });

    it('should be the day of its startTime when it has no endTime', async () => {
      const summary = await summaryOf(
        [session({ startTime: at('2026-09-02T09:00:00'), endTime: undefined })],
        '2026-09-01',
        '2026-09-03',
      );

      expect(summary.days.map((day) => day.pomodoros)).toEqual([0, 1, 0]);
    });

    it('should leave out sessions credited before or after the range', async () => {
      const summary = await summaryOf(
        [
          session({ startTime: at('2026-08-31T23:50:00'), endTime: at('2026-08-31T23:59:59') }),
          session({ startTime: at('2026-09-01T00:00:00'), endTime: at('2026-09-01T00:00:00') }),
          session({ startTime: at('2026-09-02T23:59:00'), endTime: at('2026-09-02T23:59:59') }),
          session({ startTime: at('2026-09-02T23:50:00'), endTime: at('2026-09-03T00:15:00') }),
        ],
        '2026-09-01',
        '2026-09-02',
      );

      expect(summary.days.map((day) => day.pomodoros)).toEqual([1, 1]);
    });
  });

  it('should return one zero-filled day per date of the range, oldest first', async () => {
    const summary = await summaryOf([session({})], '2026-08-30', '2026-09-02');

    expect(summary).toMatchObject({ startDate: '2026-08-30', endDate: '2026-09-02' });
    expect(summary.days.map((day) => day.date)).toEqual(['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02']);
    expect(summary.days[0]).toEqual({ date: '2026-08-30', ...tally() });
  });

  it('should make the total the sum of the days', async () => {
    const summary = await summaryOf(
      [
        session({ startTime: at('2026-09-01T10:00:00'), endTime: at('2026-09-01T10:25:00'), rewardEarned: 25 }),
        session({
          startTime: at('2026-09-03T10:00:00'),
          endTime: at('2026-09-03T10:50:00'),
          durationMinutes: 50,
          engagementType: EngagementType.STUDY,
          rewardEarned: 60,
        }),
      ],
      '2026-09-01',
      '2026-09-03',
    );

    const sum = (field: 'pomodoros' | 'focusMinutes' | 'rewardEarned') =>
      summary.days.reduce((total, day) => total + day[field], 0);
    expect(summary.total).toEqual(
      tally({
        pomodoros: sum('pomodoros'),
        byType: { work: 1, study: 1 },
        focusMinutes: sum('focusMinutes'),
        rewardEarned: sum('rewardEarned'),
      }),
    );
    expect(summary.total).toMatchObject({ pomodoros: 2, focusMinutes: 75, rewardEarned: 85 });
  });

  it('should return an empty summary for a range that starts after it ends', async () => {
    const summary = await summaryOf([session({})], '2026-09-02', '2026-09-01');

    expect(summary.days).toEqual([]);
    expect(summary.total).toEqual(tally());
  });

  it('should return an empty, zero-filled summary when the read fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    dbMock.pomodoroSessions = {
      where: vi.fn(() => ({ equals: () => ({ toArray: () => Promise.reject(new Error('IndexedDB is gone')) }) })),
    };

    const summary = await firstValueFrom(service.getPeriodSummary('2026-09-01', '2026-09-02'));

    expect(summary.days).toEqual([
      { date: '2026-09-01', ...tally() },
      { date: '2026-09-02', ...tally() },
    ]);
    expect(summary.total).toEqual(tally());
  });

  // In Chile, daylight saving time starts at midnight, so 6 September 2026 has no 00:00.
  describe('across a DST change at midnight', () => {
    beforeEach(() => {
      vi.stubEnv('TZ', 'America/Santiago');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should keep one day per date and count each session on its own day', async () => {
      const summary = await summaryOf(
        [
          session({ startTime: at('2026-09-06T12:00:00'), endTime: at('2026-09-06T12:25:00') }),
          session({ startTime: at('2026-09-07T00:30:00'), endTime: at('2026-09-07T00:55:00') }),
        ],
        '2026-09-05',
        '2026-09-08',
      );

      expect(summary.days.map((day) => [day.date, day.pomodoros])).toEqual([
        ['2026-09-05', 0],
        ['2026-09-06', 1],
        ['2026-09-07', 1],
        ['2026-09-08', 0],
      ]);
    });
  });
});
