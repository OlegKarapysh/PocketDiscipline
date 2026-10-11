import { Service, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import { DbService } from '../../../database/db.service';
import type { PomodoroRewardRates } from '../models/pomodoro-reward-rates.type';

const DEFAULT_RATES: PomodoroRewardRates = {
  [EngagementType.WORK]: 100,
  [EngagementType.STUDY]: 125,
};

@Service()
export class PomodoroRewardRateService {
  private db = inject(DbService);

  readonly rates$ = liveQuery(() => this.getRates());

  // An engagement type without a stored rate pays its default.
  async getRates(): Promise<PomodoroRewardRates> {
    const stored = await this.db.pomodoroRewardRates.toArray();
    return stored.reduce<PomodoroRewardRates>(
      (rates, rate) => ({ ...rates, [rate.engagementType]: rate.baseReward }),
      DEFAULT_RATES,
    );
  }

  async saveRates(rates: PomodoroRewardRates): Promise<void> {
    const types = Object.values(EngagementType);
    if (types.some((type) => !Number.isSafeInteger(rates[type]) || rates[type] < 1)) {
      throw new Error('A pomodoro reward must be a whole number of hryvnias, at least 1.');
    }
    await this.db.pomodoroRewardRates.bulkPut(types.map((type) => ({ engagementType: type, baseReward: rates[type] })));
  }
}
