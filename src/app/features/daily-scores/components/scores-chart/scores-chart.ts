import { Component, computed, input } from '@angular/core';
import type { DailyScore } from '../../../../core/models/daily-score.model';
import { DATE_LOCALE_CA } from '../../../../core/constants/date-locale.const';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import type { ChartDayData } from '../../models/chart-day-data.model';

@Component({
  selector: 'app-scores-chart',
  imports: [SectionCard],
  templateUrl: './scores-chart.html',
  styleUrl: './scores-chart.scss',
})
export class ScoresChart {
  readonly scores = input<DailyScore[]>([]);

  readonly chartData = computed<ChartDayData[]>(() => {
    const data: ChartDayData[] = [];
    const today = new Date();
    const currentScores = this.scores();

    const scoreMap = new Map<string, number>();
    for (const score of currentScores) {
      scoreMap.set(score.date, score.score);
    }

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString(DATE_LOCALE_CA);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });

      const scoreValue = scoreMap.get(dateStr);

      data.push({
        date: dateStr,
        dayOfWeek: dayName,
        score: scoreValue ?? null,
      });
    }

    return data;
  });
}
