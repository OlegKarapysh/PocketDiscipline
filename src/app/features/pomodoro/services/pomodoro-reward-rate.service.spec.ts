import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PomodoroRewardRateService } from './pomodoro-reward-rate.service';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import type { PomodoroRewardRate } from '../../../core/models/pomodoro-reward-rate.model';

describe('PomodoroRewardRateService', () => {
  let service: PomodoroRewardRateService;
  let db: DbService;

  const stored = (rows: PomodoroRewardRate[]) => db.pomodoroRewardRates.bulkPut(rows);

  beforeEach(async () => {
    db = await openEmptyDb();
    service = TestBed.inject(PomodoroRewardRateService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getRates', () => {
    it('should pay 100 ₴ for work and 125 ₴ for study when nothing is stored', async () => {
      await expect(service.getRates()).resolves.toEqual({
        [EngagementType.WORK]: 100,
        [EngagementType.STUDY]: 125,
      });
    });

    it('should use the stored rate and keep the default for a type without one', async () => {
      await stored([{ engagementType: EngagementType.STUDY, baseReward: 300 }]);

      await expect(service.getRates()).resolves.toEqual({
        [EngagementType.WORK]: 100,
        [EngagementType.STUDY]: 300,
      });
    });

    it('should keep the default for a stored rate that is not a valid amount', async () => {
      await stored([
        { engagementType: EngagementType.WORK, baseReward: null as unknown as number },
        { engagementType: EngagementType.STUDY, baseReward: 12.5 },
        { engagementType: 'sleep' as EngagementType, baseReward: 50 },
      ]);

      await expect(service.getRates()).resolves.toEqual({
        [EngagementType.WORK]: 100,
        [EngagementType.STUDY]: 125,
      });
    });

    it('should ignore prototype property names in stored rows', async () => {
      await stored([
        { engagementType: 'toString' as unknown as EngagementType, baseReward: 500 },
        { engagementType: 'valueOf' as unknown as EngagementType, baseReward: 500 },
      ]);

      await expect(service.getRates()).resolves.toEqual({
        [EngagementType.WORK]: 100,
        [EngagementType.STUDY]: 125,
      });
    });

    it('should fall back to default rates when database read fails', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      db.close();

      await expect(service.getRates()).resolves.toEqual({
        [EngagementType.WORK]: 100,
        [EngagementType.STUDY]: 125,
      });
    });
  });

  describe('saveRates', () => {
    it('should store a rate for every engagement type', async () => {
      await service.saveRates({ [EngagementType.WORK]: 80, [EngagementType.STUDY]: 90 });

      const rows = await db.pomodoroRewardRates.toArray();
      expect(rows).toHaveLength(2);
      expect(rows).toEqual(
        expect.arrayContaining([
          { engagementType: EngagementType.WORK, baseReward: 80 },
          { engagementType: EngagementType.STUDY, baseReward: 90 },
        ]),
      );
    });

    it('should replace the rates stored before', async () => {
      await stored([{ engagementType: EngagementType.WORK, baseReward: 300 }]);

      await service.saveRates({ [EngagementType.WORK]: 80, [EngagementType.STUDY]: 90 });

      await expect(service.getRates()).resolves.toEqual({
        [EngagementType.WORK]: 80,
        [EngagementType.STUDY]: 90,
      });
    });

    it.each([0, -5, 12.5, Number.NaN, 10_000_001])('should reject a rate of %s', async (rate) => {
      await stored([{ engagementType: EngagementType.STUDY, baseReward: 300 }]);

      await expect(service.saveRates({ [EngagementType.WORK]: rate, [EngagementType.STUDY]: 90 })).rejects.toThrow(
        'whole number of hryvnias',
      );
      await expect(db.pomodoroRewardRates.toArray()).resolves.toEqual([
        { engagementType: EngagementType.STUDY, baseReward: 300 },
      ]);
    });

    it.each([1, 10_000_000])('should accept boundary rate of %s', async (rate) => {
      await service.saveRates({ [EngagementType.WORK]: rate, [EngagementType.STUDY]: rate });

      await expect(service.getRates()).resolves.toEqual({
        [EngagementType.WORK]: rate,
        [EngagementType.STUDY]: rate,
      });
    });
  });
});
