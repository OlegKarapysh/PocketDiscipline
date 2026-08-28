import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DailyScoresService } from './daily-scores.service';
import { DbService } from '../../../core/services/db.service';
import { DailyScore } from '../models/daily-score.model';
import { firstValueFrom } from 'rxjs';
import { CURRENT_USER_ID } from '../../../core/services/user.service';

const TEST_DATE_TODAY = '2026-08-28';
const TEST_DATE_YESTERDAY = '2026-08-27';
const TEST_SCORE_PERFECT = 10;
const TEST_SCORE_GOOD = 9;
const TEST_SCORE_AVERAGE = 8;
const TEST_SCORE_LOW = 1;
const TEST_INITIAL_BALANCE = 1000;
const EXPECTED_PERFECT_BASE_REWARD = 500;
const EXPECTED_GOOD_BASE_REWARD = 100;
const EXPECTED_ZERO_REWARD = 0;
const INITIAL_STREAK = 0;
const STREAK_ONE = 1;
const STREAK_FIVE = 5;
const STREAK_FIFTEEN = 15;
const DATE_LOCALE_CA = 'en-CA';

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
          balance: TEST_INITIAL_BALANCE,
        }),
        update: vi.fn().mockResolvedValue(1),
      },
      transaction: vi.fn().mockImplementation(async (_mode, _t1, _t2, callback) => {
        await callback();
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        DailyScoresService,
        { provide: DbService, useValue: dbMock },
      ],
    });

    service = TestBed.inject(DailyScoresService);
  });

  describe('Queries', () => {
    it('should retrieve a score for a given date', async () => {
      const mockScore: DailyScore = {
        date: TEST_DATE_TODAY,
        score: TEST_SCORE_PERFECT,
        rewardEarned: EXPECTED_PERFECT_BASE_REWARD,
        streakAtThisDay: STREAK_ONE,
        createdAt: Date.now(),
      };
      dbMock.dailyScores.get.mockResolvedValue(mockScore);

      const result = await firstValueFrom(service.getScore(TEST_DATE_TODAY));

      expect(dbMock.dailyScores.get).toHaveBeenCalledWith(TEST_DATE_TODAY);
      expect(result).toEqual(mockScore);
    });

    it('should retrieve today score using local date format', async () => {
      const todayStr = new Date().toLocaleDateString(DATE_LOCALE_CA);
      const mockScore: DailyScore = {
        date: todayStr,
        score: TEST_SCORE_GOOD,
        rewardEarned: EXPECTED_GOOD_BASE_REWARD,
        streakAtThisDay: STREAK_ONE,
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
          score: TEST_SCORE_GOOD,
          rewardEarned: EXPECTED_GOOD_BASE_REWARD,
          streakAtThisDay: STREAK_ONE,
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

      const result = await service.saveTodayScore(TEST_SCORE_PERFECT);

      expect(result.reward).toBe(EXPECTED_PERFECT_BASE_REWARD);
      expect(result.newStreak).toBe(STREAK_ONE);
      expect(dbMock.dailyScores.add).toHaveBeenCalledWith(
        expect.objectContaining({
          score: TEST_SCORE_PERFECT,
          rewardEarned: EXPECTED_PERFECT_BASE_REWARD,
          streakAtThisDay: STREAK_ONE,
        })
      );
      expect(dbMock.users.update).toHaveBeenCalledWith(CURRENT_USER_ID, {
        balance: TEST_INITIAL_BALANCE + EXPECTED_PERFECT_BASE_REWARD,
      });
    });

    it('should award 100 and streak 1 for score 9 with no previous streak', async () => {
      dbMock.dailyScores.get.mockResolvedValue(undefined);

      const result = await service.saveTodayScore(TEST_SCORE_GOOD);

      expect(result.reward).toBe(EXPECTED_GOOD_BASE_REWARD);
      expect(result.newStreak).toBe(STREAK_ONE);
      expect(dbMock.users.update).toHaveBeenCalledWith(CURRENT_USER_ID, {
        balance: TEST_INITIAL_BALANCE + EXPECTED_GOOD_BASE_REWARD,
      });
    });

    it('should award 0 and reset streak to 0 for score 8 or lower', async () => {
      dbMock.dailyScores.get.mockResolvedValue({
        date: TEST_DATE_YESTERDAY,
        score: TEST_SCORE_PERFECT,
        rewardEarned: EXPECTED_PERFECT_BASE_REWARD,
        streakAtThisDay: STREAK_FIVE,
        createdAt: Date.now(),
      });

      const result = await service.saveTodayScore(TEST_SCORE_AVERAGE);

      expect(result.reward).toBe(EXPECTED_ZERO_REWARD);
      expect(result.newStreak).toBe(INITIAL_STREAK);
      expect(dbMock.dailyScores.add).toHaveBeenCalledWith(
        expect.objectContaining({
          score: TEST_SCORE_AVERAGE,
          rewardEarned: EXPECTED_ZERO_REWARD,
          streakAtThisDay: INITIAL_STREAK,
        })
      );
      expect(dbMock.users.update).not.toHaveBeenCalled();
    });

    it('should award 0 for minimum boundary score 1', async () => {
      const result = await service.saveTodayScore(TEST_SCORE_LOW);

      expect(result.reward).toBe(EXPECTED_ZERO_REWARD);
      expect(result.newStreak).toBe(INITIAL_STREAK);
    });

    it('should apply +10% bonus per day of previous streak (5-day streak = +50% bonus)', async () => {
      const expectedScaledReward = 750;
      const expectedNewStreak = 6;

      dbMock.dailyScores.get.mockResolvedValue({
        date: TEST_DATE_YESTERDAY,
        score: TEST_SCORE_PERFECT,
        rewardEarned: EXPECTED_PERFECT_BASE_REWARD,
        streakAtThisDay: STREAK_FIVE,
        createdAt: Date.now(),
      });

      const result = await service.saveTodayScore(TEST_SCORE_PERFECT);

      expect(result.reward).toBe(expectedScaledReward);
      expect(result.newStreak).toBe(expectedNewStreak);
      expect(dbMock.users.update).toHaveBeenCalledWith(CURRENT_USER_ID, {
        balance: TEST_INITIAL_BALANCE + expectedScaledReward,
      });
    });

    it('should cap streak bonus at +100% when previous streak >= 10', async () => {
      const expectedCappedReward = 1000;
      const expectedNewStreak = 16;

      dbMock.dailyScores.get.mockResolvedValue({
        date: TEST_DATE_YESTERDAY,
        score: TEST_SCORE_PERFECT,
        rewardEarned: EXPECTED_PERFECT_BASE_REWARD,
        streakAtThisDay: STREAK_FIFTEEN,
        createdAt: Date.now(),
      });

      const result = await service.saveTodayScore(TEST_SCORE_PERFECT);

      expect(result.reward).toBe(expectedCappedReward);
      expect(result.newStreak).toBe(expectedNewStreak);
    });

    it('should throw error when user is not found during reward transaction', async () => {
      dbMock.users.get.mockResolvedValue(undefined);

      await expect(service.saveTodayScore(TEST_SCORE_PERFECT)).rejects.toThrow(
        'User not found when attempting to add reward.'
      );
    });
  });
});
