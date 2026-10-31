import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { DashboardEarningsService } from './dashboard-earnings.service';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import type { Goal } from '../../../core/models/goal.model';
import { GOAL_STATUS } from '../../../core/models/goal.model';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import type { PomodoroSession } from '../../../core/models/pomodoro-session.model';
import { PomodoroSessionStatus } from '../../../core/models/pomodoro-session-status.enum';
import type { DailyScore } from '../../../core/models/daily-score.model';
import type { DailyTaskCompletion } from '../../../core/models/daily-task-completion.model';

describe('DashboardEarningsService', () => {
  let service: DashboardEarningsService;
  let db: DbService;

  const sampleGoals: Goal[] = [
    {
      id: 'g1',
      title: 'Workout Goal',
      rewardValue: 2000,
      status: GOAL_STATUS.COMPLETED,
      completedAt: new Date('2026-09-02T10:00:00').getTime(),
      createdAt: Date.now(),
    },
  ];

  const sampleScores: DailyScore[] = [
    {
      date: '2026-09-02',
      score: 10,
      rewardEarned: 500,
      streakAtThisDay: 1,
      createdAt: Date.now(),
    },
  ];

  const sampleSessions: PomodoroSession[] = [
    {
      id: 'p1',
      durationMinutes: 25,
      engagementType: EngagementType.WORK,
      startTime: new Date('2026-09-01T15:00:00').getTime(),
      status: PomodoroSessionStatus.COMPLETED,
      rewardEarned: 250,
    },
  ];

  const sampleTaskCompletions: DailyTaskCompletion[] = [
    {
      id: 'tc1',
      taskId: 't1',
      date: '2026-09-02',
      difficultyId: 'd1',
      rewardEarned: 100,
      completedAt: Date.now(),
    },
  ];

  // Replaces the sample pomodoro sessions with the given ones.
  const storeSessions = async (sessions: PomodoroSession[]) => {
    await db.pomodoroSessions.clear();
    await db.pomodoroSessions.bulkAdd(sessions);
  };

  beforeEach(async () => {
    db = await openEmptyDb();
    await db.goals.bulkAdd(sampleGoals);
    await db.dailyScores.bulkAdd(sampleScores);
    await db.pomodoroSessions.bulkAdd(sampleSessions);
    await db.dailyTaskCompletions.bulkAdd(sampleTaskCompletions);
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

    it('should leave out activity on days outside the range', async () => {
      const records = await firstValueFrom(service.getDailyEarnings('2026-09-02', '2026-09-02'));

      expect(records).toEqual([
        {
          date: '2026-09-02',
          totalEarned: 2600,
          goalsEarned: 2000,
          dailyTasksEarned: 100,
          pomodoroEarned: 0,
          dailyScoresEarned: 500,
        },
      ]);
    });

    it('should not credit a goal that is no longer completed', async () => {
      await db.goals.update('g1', { status: GOAL_STATUS.ACTIVE });

      const records = await firstValueFrom(service.getDailyEarnings('2026-09-01', '2026-09-02'));

      expect(records.find((r) => r.date === '2026-09-02')?.goalsEarned).toBe(0);
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

    it('should build a record for every day of a range longer than 90 days', async () => {
      const records = await firstValueFrom(service.getDailyEarnings('2026-01-01', '2026-12-31'));
      expect(records.length).toBe(365);
      expect(records.at(-1)?.date).toBe('2026-12-31');
    });

    it('should ignore goals without completedAt and pomodoro sessions without rewardEarned', async () => {
      await db.goals.clear();
      await db.goals.add({
        id: 'g2',
        title: 'Incomplete Goal',
        rewardValue: 1000,
        status: GOAL_STATUS.COMPLETED,
        completedAt: null,
        createdAt: Date.now(),
      });
      await storeSessions([
        {
          id: 'p2',
          durationMinutes: 25,
          engagementType: EngagementType.WORK,
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
      await storeSessions([
        {
          id: 'p3',
          durationMinutes: 30,
          engagementType: EngagementType.WORK,
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
      await storeSessions([
        {
          id: 'p4',
          durationMinutes: 30,
          engagementType: EngagementType.WORK,
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
      const session = (id: string, status: PomodoroSessionStatus): PomodoroSession => ({
        id,
        durationMinutes: 25,
        engagementType: EngagementType.WORK,
        startTime: new Date('2026-09-01T15:00:00').getTime(),
        endTime: new Date('2026-09-01T15:25:00').getTime(),
        status,
        rewardEarned: 250,
      });
      await storeSessions([
        session('p5', PomodoroSessionStatus.CANCELLED),
        session('p6', PomodoroSessionStatus.ACTIVE),
      ]);

      const records = await firstValueFrom(service.getDailyEarnings('2026-09-01', '2026-09-02'));

      expect(records.reduce((sum, r) => sum + r.pomodoroEarned, 0)).toBe(0);
    });

    it('should handle database errors gracefully and return fallback records', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
      db.close();

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
    const completedGoal = (id: string, completedAt: Date, rewardValue: number): Goal => ({
      id,
      title: 'Goal',
      rewardValue,
      status: GOAL_STATUS.COMPLETED,
      completedAt: completedAt.getTime(),
      createdAt: 0,
    });

    beforeEach(async () => {
      await Promise.all([
        db.goals.clear(),
        db.dailyScores.clear(),
        db.pomodoroSessions.clear(),
        db.dailyTaskCompletions.clear(),
      ]);
    });

    it('should calculate monthly average using elapsed days for current month', async () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();
      await db.goals.add(completedGoal('g-now', new Date(currentYear, currentMonth - 1, 1, 12), 31_000));

      const summary = await firstValueFrom(service.getMonthlyEarningsSummary(currentYear, currentMonth));

      expect(summary.isCurrentMonth).toBe(true);
      expect(summary.daysCount).toBe(currentDay);
      // 31 000 ₴ over the elapsed days, in whole hryvnias.
      expect(summary.averageEarnedPerDay).toBe(Math.round(31_000 / currentDay));
    });

    it('should calculate monthly average using total month days for completed past month', async () => {
      // Past month: August 2026 (31 days)
      await db.goals.bulkAdd([
        completedGoal('g-aug', new Date(2026, 7, 1, 12), 10_000),
        completedGoal('g-sep', new Date(2026, 8, 1, 12), 5000),
      ]);

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
