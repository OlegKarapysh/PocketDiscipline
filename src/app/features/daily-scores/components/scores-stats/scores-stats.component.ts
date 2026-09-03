import { Component, computed, input } from '@angular/core';
import { DailyScore } from '../../models/daily-score.model';

const DEFAULT_AVERAGE = 0;
const DEFAULT_STREAK = 0;
const DECIMAL_ROUNDING_FACTOR = 10;
const DATE_LOCALE_CA = 'en-CA';
const YESTERDAY_OFFSET = 1;

@Component({
  selector: 'app-scores-stats',
  imports: [],
  templateUrl: './scores-stats.component.html',
  styleUrl: './scores-stats.component.scss',
})
export class ScoresStatsComponent {
  readonly monthlyScores = input<DailyScore[]>([]);
  readonly latestScore = input<DailyScore | null>(null);
  
  readonly monthlyAverage = computed<number>(() => {
    const scores = this.monthlyScores();
    if (scores.length > 0) {
      const sum = scores.reduce((acc, curr) => acc + curr.score, 0);
      return Math.round((sum / scores.length) * DECIMAL_ROUNDING_FACTOR) / DECIMAL_ROUNDING_FACTOR;
    }
    return DEFAULT_AVERAGE;
  });

  readonly currentStreak = computed<number>(() => {
    const latest = this.latestScore();
    if (latest) {
      const today = new Date();
      const todayStr = today.toLocaleDateString(DATE_LOCALE_CA);
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - YESTERDAY_OFFSET);
      const yesterdayStr = yesterday.toLocaleDateString(DATE_LOCALE_CA);

      if (latest.date === todayStr || latest.date === yesterdayStr) {
        return latest.streakAtThisDay;
      }
    }
    return DEFAULT_STREAK;
  });
}
