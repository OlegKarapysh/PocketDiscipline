import { Component, computed, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { DailyScore } from '../../models/daily-score.model';
import { ChartDayData } from '../../models/chart-day-data.model';

const DAYS_OFFSET_START = 6;
const DATE_LOCALE_CA = 'en-CA';
const DATE_LOCALE_US = 'en-US';
const WEEKDAY_FORMAT = 'short';

@Component({
  selector: 'app-scores-chart',
  imports: [MatCardModule],
  templateUrl: './scores-chart.component.html',
  styleUrl: './scores-chart.component.scss',
})
export class ScoresChartComponent {
  readonly scores = input<DailyScore[]>([]);
  
  readonly chartData = computed<ChartDayData[]>(() => {
    const data: ChartDayData[] = [];
    const today = new Date();
    const currentScores = this.scores();
    
    const scoreMap = new Map<string, number>();
    for (const score of currentScores) {
      scoreMap.set(score.date, score.score);
    }
    
    for (let i = DAYS_OFFSET_START; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString(DATE_LOCALE_CA);
      const dayName = d.toLocaleDateString(DATE_LOCALE_US, { weekday: WEEKDAY_FORMAT });
      
      const scoreValue = scoreMap.get(dateStr);
      
      data.push({
        date: dateStr,
        dayOfWeek: dayName,
        score: scoreValue !== undefined ? scoreValue : null
      });
    }

    return data;
  });
}
