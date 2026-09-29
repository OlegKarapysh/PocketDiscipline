import { Component, computed, input } from '@angular/core';
import type { DailyScore } from '../../../../core/models/daily-score.model';
import { DATE_LOCALE_CA } from '../../../../core/constants/date-locale.const';
import { StatCard } from '../../../../shared/components/stat-card/stat-card';

@Component({
  selector: 'app-scores-stats',
  imports: [StatCard],
  templateUrl: './scores-stats.html',
  styleUrl: './scores-stats.scss',
})
export class ScoresStats {
  readonly monthlyScores = input<DailyScore[]>([]);
  readonly latestScore = input<DailyScore | null>(null);

  readonly monthlyAverage = computed<number>(() => {
    const scores = this.monthlyScores();
    if (scores.length > 0) {
      const sum = scores.reduce((acc, curr) => acc + curr.score, 0);
      return Math.round((sum / scores.length) * 10) / 10;
    }
    return 0;
  });

  readonly currentStreak = computed<number>(() => {
    const latest = this.latestScore();
    if (latest) {
      const today = new Date();
      const todayStr = today.toLocaleDateString(DATE_LOCALE_CA);
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString(DATE_LOCALE_CA);

      if (latest.date === todayStr || latest.date === yesterdayStr) {
        return latest.streakAtThisDay;
      }
    }
    return 0;
  });
}
