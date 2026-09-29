import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DailyScoresService } from './daily-scores.service';
import { DbService } from '../../../database/db.service';
import type { DailyScore } from '../../../core/models/daily-score.model';
import { firstValueFrom } from 'rxjs';
import { CURRENT_USER_ID } from '../../../core/models/user.model';
import { DATE_LOCALE_CA } from '../../../core/constants/date-locale.const';

describe('DailyScoresService', () => {
  let service: DailyScoresService;
  let dbMock: {
    dailyScores: {
      get: ReturnType<typeof vi.fn>;
      where: ReturnType<typeof vi.fn>;
      add: ReturnType<typeof vi.fn>;
    };
    users: {
      get: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    transaction: ReturnType<typeof vi.fn>;
  };
  let whereMock: {
    between: ReturnType<typeof vi.fn>;
    toArray: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    whereMock = {
      between: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    };

    dbMock = {
      dailyScores: {
        get: vi.fn().mockResolvedValue(undefined),
        where: vi.fn().mockReturnValue(whereMock),
        add: vi.fn().mockResolvedValue(undefined),
      },
      users: {
        get: vi.fn().mockResolvedValue({
          id: CURRENT_USER_ID,
          name: 'Current',
          balance: 1000,
        }),
        update: vi.fn().mockResolvedValue(1),
      },
      transaction: vi
        .fn()
        .mockImplementation(async (_mode: string, _t1: unknown, _t2: unknown, callback: () => Promise<void>) => {
          await callback();
        }),
    };

    TestBed.configureTestingModule({
      providers: [DailyScoresService, { provide: DbService, useValue: dbMock }],
    });

    service = TestBed.inject(DailyScoresService);
  });

  describe('Queries', () => {
    it('should retrieve a score for a given date', async () => {
      const mockScore: DailyScore = {
        date: '2026-08-28',
        score: 10,
        rewardEarned: 500,
        streakAtThisDay: 1,
        createdAt: Date.now(),
      };
      dbMock.dailyScores.get.mockResolvedValue(mockScore);

      const result = await firstValueFrom(service.getScore('2026-08-28'));

      expect(dbMock.dailyScores.get).toHaveBeenCalledWith('2026-08-28');
      expect(result).toEqual(mockScore);
    });

    it('should retrieve today score using local date format', async () => {
      const todayStr = new Date().toLocaleDateString(DATE_LOCALE_CA);
      const mockScore: DailyScore = {
        date: todayStr,
        score: 9,
        rewardEarned: 100,
        streakAtThisDay: 1,
        createdAt: Date.now(),
      };
      dbMock.dailyScores.get.mockResolvedValue(mockScore);

      const result = await firstValueFrom(service.getTodayScore());

      expect(dbMock.dailyScores.get).toHaveBeenCalledWith(todayStr);
      expect(result).toEqual(mockScore);
    });

    it('should retrieve current month scores', async () => {
      const mockList: DailyScore[] = [
        {
          date: '2026-08-01',
          score: 9,
          rewardEarned: 100,
          streakAtThisDay: 1,
          createdAt: Date.now(),
        },
      ];
      whereMock.toArray.mockResolvedValue(mockList);

      const result = await firstValueFrom(service.getCurrentMonthScores());

      expect(dbMock.dailyScores.where).toHaveBeenCalledWith('date');
      expect(whereMock.between).toHaveBeenCalled();
      expect(result).toEqual(mockList);
    });

    it('should retrieve last 7 days scores', async () => {
      const mockList: DailyScore[] = [];
      whereMock.toArray.mockResolvedValue(mockList);

      const result = await firstValueFrom(service.getLast7DaysScores());

      expect(dbMock.dailyScores.where).toHaveBeenCalledWith('date');
      expect(whereMock.between).toHaveBeenCalled();
      expect(result).toEqual(mockList);
    });
  });

  describe('saveTodayScore Business Logic and Rewards', () => {
    it('should award 500 and streak 1 for score 10 with no previous streak', async () => {
      dbMock.dailyScores.get.mockResolvedValue(undefined);

      const result = await service.saveTodayScore(10);

      expect(result.reward).toBe(500);
      expect(result.newStreak).toBe(1);
      expect(dbMock.dailyScores.add).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 10,
          rewardEarned: 500,
          streakAtThisDay: 1,
        }),
      );
      expect(dbMock.users.update).toHaveBeenCalledWith(CURRENT_USER_ID, {
        balance: 1000 + 500,
      });
    });

    it('should award 100 and streak 1 for score 9 with no previous streak', async () => {
      dbMock.dailyScores.get.mockResolvedValue(undefined);

      const result = await service.saveTodayScore(9);

      expect(result.reward).toBe(100);
      expect(result.newStreak).toBe(1);
      expect(dbMock.users.update).toHaveBeenCalledWith(CURRENT_USER_ID, {
        balance: 1000 + 100,
      });
    });

    it('should award 0 and reset streak to 0 for score 8 or lower', async () => {
      dbMock.dailyScores.get.mockResolvedValue({
        date: '2026-08-27',
        score: 10,
        rewardEarned: 500,
        streakAtThisDay: 5,
        createdAt: Date.now(),
      });

      const result = await service.saveTodayScore(8);

      expect(result.reward).toBe(0);
      expect(result.newStreak).toBe(0);
      expect(dbMock.dailyScores.add).toHaveBeenCalledWith(
        expect.objectContaining({
          score: 8,
          rewardEarned: 0,
          streakAtThisDay: 0,
        }),
      );
      expect(dbMock.users.update).not.toHaveBeenCalled();
    });

    it('should award 0 for minimum boundary score 1', async () => {
      const result = await service.saveTodayScore(1);

      expect(result.reward).toBe(0);
      expect(result.newStreak).toBe(0);
    });

    it('should apply +10% bonus per day of previous streak (5-day streak = +50% bonus)', async () => {
      const expectedScaledReward = 750;
      const expectedNewStreak = 6;

      dbMock.dailyScores.get.mockResolvedValue({
        date: '2026-08-27',
        score: 10,
        rewardEarned: 500,
        streakAtThisDay: 5,
        createdAt: Date.now(),
      });

      const result = await service.saveTodayScore(10);

      expect(result.reward).toBe(expectedScaledReward);
      expect(result.newStreak).toBe(expectedNewStreak);
      expect(dbMock.users.update).toHaveBeenCalledWith(CURRENT_USER_ID, {
        balance: 1000 + expectedScaledReward,
      });
    });

    it('should cap streak bonus at +100% when previous streak >= 10', async () => {
      const expectedCappedReward = 1000;
      const expectedNewStreak = 16;

      dbMock.dailyScores.get.mockResolvedValue({
        date: '2026-08-27',
        score: 10,
        rewardEarned: 500,
        streakAtThisDay: 15,
        createdAt: Date.now(),
      });

      const result = await service.saveTodayScore(10);

      expect(result.reward).toBe(expectedCappedReward);
      expect(result.newStreak).toBe(expectedNewStreak);
    });

    it('should throw error when user is not found during reward transaction', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
      dbMock.users.get.mockResolvedValue(undefined);

      await expect(service.saveTodayScore(10)).rejects.toThrow('User not found when attempting to add reward.');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save daily score:', expect.any(Error));
    });

    it('should catch and rethrow database transaction errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
      dbMock.transaction.mockRejectedValue(new Error('Transaction failed'));

      await expect(service.saveTodayScore(10)).rejects.toThrow('Transaction failed');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save daily score:', expect.any(Error));
    });
  });
});
