import { DailyScoreOption } from './daily-score-option.model';
import { DailyScoreTier } from './daily-score-tier.model';

export class DailyScoreSystem {
  static readonly TIERS = [
    new DailyScoreTier(1, 3, 'Low Discipline', 'Tough day. Acknowledge it and reset for tomorrow.', 'battery_alert', 'tier-low'),
    new DailyScoreTier(4, 6, 'Moderate Discipline', 'Steady progress. Kept things moving forward.', 'trending_flat', 'tier-moderate'),
    new DailyScoreTier(7, 8, 'Good Discipline', 'Strong day! Maintained focus and completed key habits.', 'check_circle', 'tier-good'),
    new DailyScoreTier(9, 10, 'Exceptional Discipline', 'Flawless execution! You crushed every objective.', 'workspace_premium', 'tier-exceptional'),
  ];

  static readonly OPTIONS: DailyScoreOption[] = [
    new DailyScoreOption(1, DailyScoreSystem.TIERS[0], 0),
    new DailyScoreOption(2, DailyScoreSystem.TIERS[0], 0),
    new DailyScoreOption(3, DailyScoreSystem.TIERS[0], 0),
    new DailyScoreOption(4, DailyScoreSystem.TIERS[1], 0),
    new DailyScoreOption(5, DailyScoreSystem.TIERS[1], 0),
    new DailyScoreOption(6, DailyScoreSystem.TIERS[1], 0),
    new DailyScoreOption(7, DailyScoreSystem.TIERS[2], 0),
    new DailyScoreOption(8, DailyScoreSystem.TIERS[2], 0),
    new DailyScoreOption(9, DailyScoreSystem.TIERS[3], 100),
    new DailyScoreOption(10, DailyScoreSystem.TIERS[3], 500),
  ];

  static getOption(score: number): DailyScoreOption | undefined {
    return this.OPTIONS.find(o => o.value === score);
  }
}
