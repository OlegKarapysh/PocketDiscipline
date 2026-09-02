import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { DashboardEarningsService } from './dashboard-earnings.service';
import { DbService } from '../../../core/services/db.service';
import { GOAL_STATUS } from '../../goals/models/goal.model';

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
      status: 'completed',
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
          equals: vi.fn().mockReturnValue({
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
      pomodoroSessions: {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(sampleSessions),
          }),
        }),
      },
      dailyTaskCompletions: {
        where: vi.fn().mockReturnValue({
          between: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue(sampleTaskCompletions),
          }),
        }),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        DashboardEarningsService,
        { provide: DbService, useValue: dbMock },
      ],
    });

    service = TestBed.inject(DashboardEarningsService);
  });

  describe('getPresetDateRange', () => {
    it('should return 7 days range for last7 preset', () => {
      const range = service.getPresetDateRange('last7');
      expect(range.startDate).toBeDefined();
      expect(range.endDate).toBeDefined();

      const start = new Date(range.startDate);
      const end = new Date(range.endDate);
      const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
      expect(diffDays).toBe(6);
    });

    it('should return 14 days range for last14 preset', () => {
      const range = service.getPresetDateRange('last14');
      const start = new Date(range.startDate);
      const end = new Date(range.endDate);
      const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
      expect(diffDays).toBe(13);
    });

    it('should return 30 days range for last30 preset', () => {
      const range = service.getPresetDateRange('last30');
      const start = new Date(range.startDate);
      const end = new Date(range.endDate);
      const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
      expect(diffDays).toBe(29);
    });

    it('should fallback to 7 days offset when custom preset is passed', () => {
      const range = service.getPresetDateRange('custom');
      const start = new Date(range.startDate);
      const end = new Date(range.endDate);
      const diffDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
      expect(diffDays).toBe(6);
    });
  });

  describe('getDailyEarnings', () => {
    it('should aggregate earnings across all 4 sources for each day in range', async () => {
      const records = await firstValueFrom(service.getDailyEarnings('2026-09-01', '2026-09-02'));

      expect(records.length).toBe(2);

      const day1 = records.find(r => r.date === '2026-09-01');
      expect(day1).toBeDefined();
      expect(day1?.pomodoroEarned).toBe(250);
      expect(day1?.goalsEarned).toBe(0);
      expect(day1?.totalEarned).toBe(250);

      const day2 = records.find(r => r.date === '2026-09-02');
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

    it('should ignore goals without completedAt and pomodoro sessions without rewardEarned', async () => {
      dbMock.goals.where = vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            {
              id: 'g2',
              title: 'Incomplete Goal',
              rewardValue: 1000,
              status: GOAL_STATUS.COMPLETED,
              completedAt: null,
            },
          ]),
        }),
      });

      dbMock.pomodoroSessions.where = vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            {
              id: 'p2',
              durationMinutes: 25,
              engagementType: 'work',
              startTime: new Date('2026-09-01T15:00:00').getTime(),
              endTime: new Date('2026-09-01T15:25:00').getTime(),
              status: 'completed',
              rewardEarned: undefined,
            },
          ]),
        }),
      });

      const records = await firstValueFrom(service.getDailyEarnings('2026-09-01', '2026-09-02'));
      const day1 = records.find(r => r.date === '2026-09-01');
      expect(day1?.pomodoroEarned).toBe(0);
      expect(day1?.goalsEarned).toBe(0);
    });
  });

  describe('getMonthlyEarningsSummary', () => {
    it('should calculate monthly average using elapsed days for current month', async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();

      const summary = await firstValueFrom(service.getMonthlyEarningsSummary(currentYear, currentMonth));

      expect(summary.isCurrentMonth).toBe(true);
      expect(summary.daysCount).toBe(currentDay);
      expect(summary.averageEarnedPerDay).toBe(Math.round(summary.totalEarned / currentDay));
    });

    it('should calculate monthly average using total month days for completed past month', async () => {
      // Past month: August 2026 (31 days)
      const summary = await firstValueFrom(service.getMonthlyEarningsSummary(2026, 8));

      expect(summary.isCurrentMonth).toBe(false);
      expect(summary.daysCount).toBe(31);
      expect(summary.monthLabel).toContain('August');
      expect(summary.averageEarnedPerDay).toBe(Math.round(summary.totalEarned / 31));
    });
  });
});
