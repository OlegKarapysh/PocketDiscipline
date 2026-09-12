import { DailyScoreTier } from './daily-score-tier.model';

export class DailyScoreOption {
  constructor(
    public readonly value: number,
    public readonly tier: DailyScoreTier,
    public readonly baseReward: number
  ) {}

  get isStreakEligible(): boolean {
    return this.value >= 9;
  }
}
