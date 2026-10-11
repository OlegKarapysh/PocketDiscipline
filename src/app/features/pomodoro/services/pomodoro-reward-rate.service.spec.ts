import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PomodoroRewardRateService } from './pomodoro-reward-rate.service';
import { DbService } from '../../../database/db.service';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import type { PomodoroRewardRate } from '../../../core/models/pomodoro-reward-rate.model';

describe('PomodoroRewardRateService', () => {
  let service: PomodoroRewardRateService;
  let dbMock: {
    pomodoroRewardRates: {
      toArray: ReturnType<typeof vi.fn>;
      bulkPut: ReturnType<typeof vi.fn>;
    };
  };

  const stored = (rows: PomodoroRewardRate[]) => {
    dbMock.pomodoroRewardRates.toArray.mockResolvedValue(rows);
  };

  beforeEach(() => {
    dbMock = {
      pomodoroRewardRates: {
        toArray: vi.fn().mockResolvedValue([]),
        bulkPut: vi.fn().mockResolvedValue(undefined),
      },
    };

    TestBed.configureTestingModule({
      providers: [PomodoroRewardRateService, { provide: DbService, useValue: dbMock }],
    });
    service = TestBed.inject(PomodoroRewardRateService);
  });

  describe('getRates', () => {
    it('should pay 100 ₴ for work and 125 ₴ for study when nothing is stored', async () => {
      await expect(service.getRates()).resolves.toEqual({
        [EngagementType.WORK]: 100,
        [EngagementType.STUDY]: 125,
      });
    });

    it('should use the stored rate and keep the default for a type without one', async () => {
      stored([{ engagementType: EngagementType.STUDY, baseReward: 300 }]);

      await expect(service.getRates()).resolves.toEqual({
        [EngagementType.WORK]: 100,
        [EngagementType.STUDY]: 300,
      });
    });
  });

  describe('saveRates', () => {
    it('should store a rate for every engagement type', async () => {
      await service.saveRates({ [EngagementType.WORK]: 80, [EngagementType.STUDY]: 90 });

      const [rows] = dbMock.pomodoroRewardRates.bulkPut.mock.calls[0] as [PomodoroRewardRate[]];
      expect(rows).toHaveLength(2);
      expect(rows).toEqual(
        expect.arrayContaining([
          { engagementType: EngagementType.WORK, baseReward: 80 },
          { engagementType: EngagementType.STUDY, baseReward: 90 },
        ]),
      );
    });

    it.each([0, -5, 12.5, Number.NaN])('should reject a rate of %s', async (rate) => {
      await expect(service.saveRates({ [EngagementType.WORK]: rate, [EngagementType.STUDY]: 90 })).rejects.toThrow(
        'whole number of hryvnias',
      );
      expect(dbMock.pomodoroRewardRates.bulkPut).not.toHaveBeenCalled();
    });
  });
});
