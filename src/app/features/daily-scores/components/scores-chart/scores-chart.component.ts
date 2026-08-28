import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyScore } from '../../models/daily-score.model';

const DAYS_OFFSET_START = 6;
const DATE_LOCALE_CA = 'en-CA';
const DATE_LOCALE_US = 'en-US';
const WEEKDAY_FORMAT = 'short';

export interface ChartDayData {
  dayOfWeek: string;
  score: number | null;
  date: string;
}

@Component({
  selector: 'app-scores-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scores-chart.component.html',
  styleUrl: './scores-chart.component.scss',
})
export class ScoresChartComponent implements OnChanges {
  @Input() scores: DailyScore[] = [];
  
  chartData: ChartDayData[] = [];

  ngOnChanges() {
    this.generateChartData();
  }

  private generateChartData() {
    this.chartData = [];
    const today = new Date();
    
    const scoreMap = new Map<string, number>();
    for (const score of this.scores) {
      scoreMap.set(score.date, score.score);
    }
    
    for (let i = DAYS_OFFSET_START; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString(DATE_LOCALE_CA);
      const dayName = d.toLocaleDateString(DATE_LOCALE_US, { weekday: WEEKDAY_FORMAT });
      
      const scoreValue = scoreMap.get(dateStr);
      
      this.chartData.push({
        date: dateStr,
        dayOfWeek: dayName,
        score: scoreValue !== undefined ? scoreValue : null
      });
    }
  }
}
