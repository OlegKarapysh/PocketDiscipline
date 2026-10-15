import { Service, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { EngagementType } from '../../../core/models/engagement-type.enum';
import { DbService } from '../../../database/db.service';
import { MAX_MONEY_AMOUNT } from '../../../shared/validators/money-amount';
import type { PomodoroRewardRates } from '../models/pomodoro-reward-rates.type';

const DEFAULT_RATES: PomodoroRewardRates = {
  [EngagementType.WORK]: 100,
  [EngagementType.STUDY]: 125,
};

@Service()
export class PomodoroRewardRateService {
  private db = inject(DbService);

  readonly rates$ = liveQuery(() => this.getRates());

  // An engagement type without a valid stored rate pays its default.
  async getRates(): Promise<PomodoroRewardRates> {
    const stored = await this.db.pomodoroRewardRates.toArray();
    const valid = stored.filter((row) => row.engagementType in DEFAULT_RATES && this.isValidRate(row.baseReward));
    return { ...DEFAULT_RATES, ...Object.fromEntries(valid.map((row) => [row.engagementType, row.baseReward])) };
  }

  async saveRates(rates: PomodoroRewardRates): Promise<void> {
    const types = Object.values(EngagementType);
    if (!types.every((type) => this.isValidRate(rates[type]))) {
      throw new Error(`A pomodoro reward must be a whole number of hryvnias, from 1 to ${MAX_MONEY_AMOUNT}.`);
    }
    await this.db.pomodoroRewardRates.bulkPut(types.map((type) => ({ engagementType: type, baseReward: rates[type] })));
  }

  private isValidRate(rate: unknown): boolean {
    return typeof rate === 'number' && Number.isInteger(rate) && rate >= 1 && rate <= MAX_MONEY_AMOUNT;
  }
}
