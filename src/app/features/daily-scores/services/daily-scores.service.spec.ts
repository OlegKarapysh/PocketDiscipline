import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { DailyScoresService } from './daily-scores.service';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import type { DailyScore } from '../../../core/models/daily-score.model';
import { CURRENT_USER_ID } from '../../../core/models/user.model';

// The service reads "today" from the clock; the tests pin it to 2026-08-28, local noon.
const TODAY = '2026-08-28';
const YESTERDAY = '2026-08-27';

const score = (date: string, value: number, streakAtThisDay = 0, rewardEarned = 0): DailyScore => ({
  date,
  score: value,
  rewardEarned,
  streakAtThisDay,
  createdAt: 1000,
});

describe('DailyScoresService', () => {
  let service: DailyScoresService;
  let db: DbService;

  const balance = async () => (await db.users.get(CURRENT_USER_ID))?.balance;
  const dates = (rows: DailyScore[]) => rows.map((row) => row.date).sort();

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 7, 28, 12));

    db = await openEmptyDb();
    await db.users.add({ id: CURRENT_USER_ID, name: 'Current', balance: 1000, createdAt: 0, updatedAt: 0 });
    service = TestBed.inject(DailyScoresService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Queries', () => {
    it('should retrieve a score for a given date', async () => {
      const stored = score('2026-08-20', 10, 1, 500);
      await db.dailyScores.bulkAdd([stored, score('2026-08-21', 9, 2, 110)]);

      expect(await firstValueFrom(service.getScore('2026-08-20'))).toEqual(stored);
      expect(await firstValueFrom(service.getScore('2026-08-22'))).toBeUndefined();
    });

    it('should retrieve today score using local date format', async () => {
      const today = score(TODAY, 9, 1, 100);
      await db.dailyScores.bulkAdd([today, score(YESTERDAY, 10, 1, 500)]);

      expect(await firstValueFrom(service.getTodayScore())).toEqual(today);
    });

    it('should retrieve current month scores', async () => {
      await db.dailyScores.bulkAdd([
        score('2026-07-31', 9),
        score('2026-08-01', 9),
        score('2026-08-15', 10),
        score('2026-08-31', 8),
        score('2026-09-01', 10),
      ]);

      const result = await firstValueFrom(service.getCurrentMonthScores());

      expect(dates(result)).toEqual(['2026-08-01', '2026-08-15', '2026-08-31']);
    });

    it('should retrieve last 7 days scores', async () => {
      await db.dailyScores.bulkAdd([
        score('2026-08-21', 9),
        score('2026-08-22', 9),
        score('2026-08-25', 10),
        score(TODAY, 8),
        score('2026-08-29', 10),
      ]);

      const result = await firstValueFrom(service.getLast7DaysScores());

      expect(dates(result)).toEqual(['2026-08-22', '2026-08-25', TODAY]);
    });

    it('should retrieve scores in a specified date range, both ends included', async () => {
      await db.dailyScores.bulkAdd([
        score('2026-07-31', 9),
        score('2026-08-01', 9),
        score('2026-08-15', 10, 2, 500),
        score('2026-08-31', 8),
        score('2026-09-01', 10),
      ]);

      const result = await firstValueFrom(service.getScoresInRange('2026-08-01', '2026-08-31'));

      expect(dates(result)).toEqual(['2026-08-01', '2026-08-15', '2026-08-31']);
      expect(result.find((row) => row.date === '2026-08-15')).toEqual(score('2026-08-15', 10, 2, 500));
    });

    it('should return empty array when startDate or endDate is missing or invalid in getScoresInRange', async () => {
      await db.dailyScores.bulkAdd([score('2026-08-01', 9), score('2026-08-31', 10)]);

      expect(await firstValueFrom(service.getScoresInRange('', '2026-08-31'))).toEqual([]);
      expect(await firstValueFrom(service.getScoresInRange('2026-08-31', ''))).toEqual([]);
      expect(await firstValueFrom(service.getScoresInRange('2026-08-31', '2026-08-01'))).toEqual([]);
    });
  });

  describe('saveTodayScore Business Logic and Rewards', () => {
    it('should award 500 and streak 1 for score 10 with no previous streak', async () => {
      const result = await service.saveTodayScore(10);

      expect(result).toEqual({ reward: 500, newStreak: 1 });
      expect(await db.dailyScores.get(TODAY)).toMatchObject({ score: 10, rewardEarned: 500, streakAtThisDay: 1 });
      expect(await balance()).toBe(1500);
    });

    it('should award 100 and streak 1 for score 9 with no previous streak', async () => {
      const result = await service.saveTodayScore(9);

      expect(result).toEqual({ reward: 100, newStreak: 1 });
      expect(await db.dailyScores.get(TODAY)).toMatchObject({ score: 9, rewardEarned: 100, streakAtThisDay: 1 });
      expect(await balance()).toBe(1100);
    });

    it('should award 0 and reset streak to 0 for score 8 or lower', async () => {
      await db.dailyScores.add(score(YESTERDAY, 10, 5, 500));

      const result = await service.saveTodayScore(8);

      expect(result).toEqual({ reward: 0, newStreak: 0 });
      expect(await db.dailyScores.get(TODAY)).toMatchObject({ score: 8, rewardEarned: 0, streakAtThisDay: 0 });
      expect(await balance()).toBe(1000);
    });

    it('should award 0 for minimum boundary score 1', async () => {
      const result = await service.saveTodayScore(1);

      expect(result).toEqual({ reward: 0, newStreak: 0 });
      expect(await db.dailyScores.get(TODAY)).toMatchObject({ score: 1, rewardEarned: 0, streakAtThisDay: 0 });
      expect(await balance()).toBe(1000);
    });

    it('should apply +10% bonus per day of previous streak (5-day streak = +50% bonus)', async () => {
      await db.dailyScores.add(score(YESTERDAY, 10, 5, 500));

      const result = await service.saveTodayScore(10);

      expect(result).toEqual({ reward: 750, newStreak: 6 });
      expect(await db.dailyScores.get(TODAY)).toMatchObject({ rewardEarned: 750, streakAtThisDay: 6 });
      expect(await balance()).toBe(1750);
    });

    it('should not continue a streak that ended before yesterday', async () => {
      await db.dailyScores.add(score('2026-08-26', 10, 5, 500));

      const result = await service.saveTodayScore(10);

      expect(result).toEqual({ reward: 500, newStreak: 1 });
      expect(await balance()).toBe(1500);
    });

    it('should cap streak bonus at +100% when previous streak >= 10', async () => {
      await db.dailyScores.add(score(YESTERDAY, 10, 15, 1000));

      const result = await service.saveTodayScore(10);

      expect(result).toEqual({ reward: 1000, newStreak: 16 });
      expect(await balance()).toBe(2000);
    });

    it('should throw error and store nothing when user is not found during reward transaction', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
      await db.users.clear();

      await expect(service.saveTodayScore(10)).rejects.toThrow('User not found when attempting to add reward.');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save daily score:', expect.any(Error));
      expect(await db.dailyScores.get(TODAY)).toBeUndefined();
    });

    it('should log and rethrow when the score cannot be stored, leaving the stored data unchanged', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
      const alreadySaved = score(TODAY, 9, 1, 100);
      await db.dailyScores.add(alreadySaved);

      await expect(service.saveTodayScore(10)).rejects.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save daily score:', expect.anything());
      expect(await db.dailyScores.get(TODAY)).toEqual(alreadySaved);
      expect(await balance()).toBe(1000);
    });
  });
});
