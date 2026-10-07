import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { DashboardEarningsService } from './dashboard-earnings.service';
import { DbService } from '../../../database/db.service';
import { GOAL_STATUS } from '../../../core/models/goal.model';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import type { DailyEarningsRecord } from '../models/daily-earnings-record.model';

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

// A pomodoroSessions table that answers whichever index it is queried by, so the spec does not
// depend on how the service narrows the query.
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
    })),
  };
}

describe('DashboardEarningsService', () => {
  let service: DashboardEarningsService;
  let dbMock: {
    goals: {
      where: ReturnType<typeof vi.fn>;
    };
    dailyScores: {
      where: ReturnType<typeof vi.fn>;
    };
    pomodoroSessions: {
      where: ReturnType<typeof vi.fn>;
    };
    dailyTaskCompletions: {
      where: ReturnType<typeof vi.fn>;
    };
  };

  const sampleGoals = [
    {
      id: 'g1',
      title: 'Workout Goal',
      rewardValue: 2000,
      status: GOAL_STATUS.COMPLETED,
      completedAt: new Date('2026-09-02T10:00:00').getTime(),
      createdAt: Date.now(),
    },
  ];

  const sampleScores = [
    {
      date: '2026-09-02',
      score: 10,
      rewardEarned: 500,
      streakAtThisDay: 1,
      createdAt: Date.now(),
    },
  ];

  const sampleSessions = [
    {
      id: 'p1',
      durationMinutes: 25,
      engagementType: 'work',
      startTime: new Date('2026-09-01T15:00:00').getTime(),
      status: PomodoroSessionStatus.COMPLETED,
      rewardEarned: 250,
    },
  ];

  const sampleTaskCompletions = [
    {
      id: 'tc1',
      taskId: 't1',
      date: '2026-09-02',
      difficultyId: 'd1',
      rewardEarned: 100,
      completedAt: Date.now(),
    },
  ];

  beforeEach(() => {
    dbMock = {
      goals: {
        where: vi.fn().mockReturnValue({
          between: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(sampleGoals),
          }),
          equals: vi.fn().mockReturnValue({
            filter: vi.fn().mockImplementation((predicate: (goal: (typeof sampleGoals)[number]) => boolean) => ({
              toArray: vi.fn().mockResolvedValue(sampleGoals.filter(predicate)),
            })),
            toArray: vi.fn().mockResolvedValue(sampleGoals),
          }),
        }),
      },
      dailyScores: {
        where: vi.fn().mockReturnValue({
          between: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(sampleScores),
          }),
        }),
      },
      pomodoroSessions: pomodoroTable(sampleSessions),
      dailyTaskCompletions: {
        where: vi.fn().mockReturnValue({
          between: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(sampleTaskCompletions),
          }),
        }),
      },
    };

    TestBed.configureTestingModule({
      providers: [DashboardEarningsService, { provide: DbService, useValue: dbMock }],
    });

    service = TestBed.inject(DashboardEarningsService);
  });

  describe('getPresetDateRange', () => {
    it('should return 7 days range for last7 preset', () => {
      const range = service.getPresetDateRange('last7');
      expect(range.startDate).toBeDefined();
      expect(range.endDate).toBeDefined();

      const [sY, sM, sD] = range.startDate.split('-').map(Number);
      const [eY, eM, eD] = range.endDate.split('-').map(Number);
      const start = new Date(sY, sM - 1, sD);
      const end = new Date(eY, eM - 1, eD);
      const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
      expect(diffDays).toBe(6);
    });

    it('should return 14 days range for last14 preset', () => {
      const range = service.getPresetDateRange('last14');
      const [sY, sM, sD] = range.startDate.split('-').map(Number);
      const [eY, eM, eD] = range.endDate.split('-').map(Number);
      const start = new Date(sY, sM - 1, sD);
      const end = new Date(eY, eM - 1, eD);
      const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
      expect(diffDays).toBe(13);
    });

    it('should return 30 days range for last30 preset', () => {
      const range = service.getPresetDateRange('last30');
      const [sY, sM, sD] = range.startDate.split('-').map(Number);
      const [eY, eM, eD] = range.endDate.split('-').map(Number);
      const start = new Date(sY, sM - 1, sD);
      const end = new Date(eY, eM - 1, eD);
      const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
      expect(diffDays).toBe(29);
    });

    it('should fallback to 7 days offset when custom preset is passed', () => {
      const range = service.getPresetDateRange('custom');
      const [sY, sM, sD] = range.startDate.split('-').map(Number);
      const [eY, eM, eD] = range.endDate.split('-').map(Number);
      const start = new Date(sY, sM - 1, sD);
      const end = new Date(eY, eM - 1, eD);
      const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
      expect(diffDays).toBe(6);
    });
  });

  describe('getDailyEarnings', () => {
    it('should aggregate earnings across all 4 sources for each day in range', async () => {
      const records = await firstValueFrom(service.getDailyEarnings('2026-09-01', '2026-09-02'));

      expect(records.length).toBe(2);

      const day1 = records.find((r) => r.date === '2026-09-01');
      expect(day1).toBeDefined();
      expect(day1?.pomodoroEarned).toBe(250);
      expect(day1?.goalsEarned).toBe(0);
      expect(day1?.totalEarned).toBe(250);

      const day2 = records.find((r) => r.date === '2026-09-02');
      expect(day2).toBeDefined();
      expect(day2?.goalsEarned).toBe(2000);
      expect(day2?.dailyScoresEarned).toBe(500);
      expect(day2?.dailyTasksEarned).toBe(100);
      expect(day2?.totalEarned).toBe(2600);
    });

    it('should return zero earnings for days with no activity', async () => {
      const records = await firstValueFrom(service.getDailyEarnings('2026-08-20', '2026-08-22'));

      expect(records.length).toBe(3);
      for (const record of records) {
        expect(record.totalEarned).toBe(0);
        expect(record.goalsEarned).toBe(0);
        expect(record.dailyTasksEarned).toBe(0);
        expect(record.pomodoroEarned).toBe(0);
        expect(record.dailyScoresEarned).toBe(0);
      }
    });

    it('should return empty array when startDate > endDate', async () => {
      const records = await firstValueFrom(service.getDailyEarnings('2026-09-10', '2026-09-01'));
      expect(records).toEqual([]);
    });

    it('should cap days at 90 days maximum for wide ranges', async () => {
      const records = await firstValueFrom(service.getDailyEarnings('2026-01-01', '2026-12-31'));
      expect(records.length).toBe(90);
    });

    it('should ignore goals without completedAt and pomodoro sessions without rewardEarned', async () => {
      const incompleteGoals = [
        {
          id: 'g2',
          title: 'Incomplete Goal',
          rewardValue: 1000,
          status: GOAL_STATUS.COMPLETED,
          completedAt: null,
        },
      ];
      dbMock.goals.where = vi.fn().mockReturnValue({
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(incompleteGoals),
        }),
        equals: vi.fn().mockReturnValue({
          filter: vi.fn().mockImplementation((predicate: (goal: (typeof incompleteGoals)[number]) => boolean) => ({
            toArray: vi.fn().mockResolvedValue(incompleteGoals.filter(predicate)),
          })),
          toArray: vi.fn().mockResolvedValue(incompleteGoals),
        }),
      });

      dbMock.pomodoroSessions = pomodoroTable([
        {
          id: 'p2',
          durationMinutes: 25,
          engagementType: 'work',
          startTime: new Date('2026-09-01T15:00:00').getTime(),
          endTime: new Date('2026-09-01T15:25:00').getTime(),
          status: PomodoroSessionStatus.COMPLETED,
          rewardEarned: undefined,
        },
      ]);

      const records = await firstValueFrom(service.getDailyEarnings('2026-09-01', '2026-09-02'));
      const day1 = records.find((r) => r.date === '2026-09-01');
      expect(day1?.pomodoroEarned).toBe(0);
      expect(day1?.goalsEarned).toBe(0);
    });

    it('should credit a pomodoro to the day it ended, even when it started before the range', async () => {
      dbMock.pomodoroSessions = pomodoroTable([
        {
          id: 'p3',
          durationMinutes: 30,
          engagementType: 'work',
          startTime: new Date('2026-08-31T23:50:00').getTime(),
          endTime: new Date('2026-09-01T00:20:00').getTime(),
          status: PomodoroSessionStatus.COMPLETED,
          rewardEarned: 300,
        },
      ]);

      const records = await firstValueFrom(service.getDailyEarnings('2026-09-01', '2026-09-02'));

      expect(records.find((r) => r.date === '2026-09-01')?.pomodoroEarned).toBe(300);
    });

    it('should not credit a pomodoro that ended after the range, even when it started inside it', async () => {
      dbMock.pomodoroSessions = pomodoroTable([
        {
          id: 'p4',
          durationMinutes: 30,
          engagementType: 'work',
          startTime: new Date('2026-09-02T23:50:00').getTime(),
          endTime: new Date('2026-09-03T00:20:00').getTime(),
          status: PomodoroSessionStatus.COMPLETED,
          rewardEarned: 300,
        },
      ]);

      const records = await firstValueFrom(service.getDailyEarnings('2026-09-01', '2026-09-02'));

      expect(records.reduce((sum, r) => sum + r.pomodoroEarned, 0)).toBe(0);
    });

    it('should leave out pomodoros that were cancelled or are still running', async () => {
      const session = (id: string, status: PomodoroSessionStatus): object => ({
        id,
        durationMinutes: 25,
        engagementType: 'work',
        startTime: new Date('2026-09-01T15:00:00').getTime(),
        endTime: new Date('2026-09-01T15:25:00').getTime(),
        status,
        rewardEarned: 250,
      });
      dbMock.pomodoroSessions = pomodoroTable([
        session('p5', PomodoroSessionStatus.CANCELLED),
        session('p6', PomodoroSessionStatus.ACTIVE),
      ]);

      const records = await firstValueFrom(service.getDailyEarnings('2026-09-01', '2026-09-02'));

      expect(records.reduce((sum, r) => sum + r.pomodoroEarned, 0)).toBe(0);
    });

    it('should handle database errors gracefully and return fallback records', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
      dbMock.goals.where = vi.fn().mockReturnValue({
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockRejectedValue(new Error('IndexedDB error')),
        }),
      });

      const records = await firstValueFrom(service.getDailyEarnings('2026-09-01', '2026-09-02'));
      expect(records).toBeDefined();
      expect(Array.isArray(records)).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return empty array for invalid date strings', async () => {
      const records = await firstValueFrom(service.getDailyEarnings('invalid-date', '2026-09-02'));
      expect(records).toEqual([]);
    });
  });

  describe('getMonthlyEarningsSummary', () => {
    const earnedOn = (date: string, totalEarned: number): DailyEarningsRecord => ({
      date,
      totalEarned,
      goalsEarned: totalEarned,
      dailyTasksEarned: 0,
      pomodoroEarned: 0,
      dailyScoresEarned: 0,
    });

    it('should calculate monthly average using elapsed days for current month', async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();
      vi.spyOn(service, 'calculateDailyEarnings').mockResolvedValue([earnedOn('2026-09-01', 31_000)]);

      const summary = await firstValueFrom(service.getMonthlyEarningsSummary(currentYear, currentMonth));

      expect(summary.isCurrentMonth).toBe(true);
      expect(summary.daysCount).toBe(currentDay);
      // 31 000 ₴ over the elapsed days, in whole hryvnias.
      expect(summary.averageEarnedPerDay).toBe(Math.round(31_000 / currentDay));
    });

    it('should calculate monthly average using total month days for completed past month', async () => {
      // Past month: August 2026 (31 days)
      vi.spyOn(service, 'calculateDailyEarnings').mockResolvedValue([earnedOn('2026-08-01', 10_000)]);

      const summary = await firstValueFrom(service.getMonthlyEarningsSummary(2026, 8));

      expect(summary.isCurrentMonth).toBe(false);
      expect(summary.daysCount).toBe(31);
      expect(summary.monthLabel).toContain('August');
      expect(summary.totalEarned).toBe(10_000);
      // 10 000 ₴ / 31 is 322.58 ₴: the average is rounded to whole hryvnias, 323 ₴.
      expect(summary.averageEarnedPerDay).toBe(323);
    });

    it('should handle error gracefully and return fallback summary when calculation fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
      vi.spyOn(service, 'calculateDailyEarnings').mockRejectedValue(new Error('DB failure'));

      const summary = await firstValueFrom(service.getMonthlyEarningsSummary(2026, 8));
      expect(summary).toBeDefined();
      expect(summary.totalEarned).toBe(0);
      expect(summary.averageEarnedPerDay).toBe(0);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return fallback summary for invalid year or month', async () => {
      const summary = await firstValueFrom(service.getMonthlyEarningsSummary(0, 13));
      expect(summary).toBeDefined();
      expect(summary.totalEarned).toBe(0);
      expect(summary.averageEarnedPerDay).toBe(0);
    });
  });
});
