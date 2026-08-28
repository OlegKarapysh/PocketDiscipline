import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyScore } from '../../models/daily-score.model';

@Component({
  selector: 'app-scores-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <h3>Last 7 Days</h3>
      
      @if (chartData.length > 0) {
        <div class="bars">
          @for (item of chartData; track item.date) {
            <div class="bar-wrapper">
              <div class="score-label">{{ item.score !== null ? item.score : '-' }}</div>
              <div class="bar" 
                   [style.height.%]="item.score ? item.score * 10 : 0"
                   [class.empty]="!item.score"
                   [class.high-score]="item.score && item.score >= 9">
              </div>
              <div class="day-label">{{ item.dayOfWeek }}</div>
            </div>
          }
        </div>
      } @else {
        <p class="no-data">No scores yet for the last 7 days.</p>
      }
    </div>
  `,
  styles: [`
    .chart-container {
      padding: 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-top: 16px;
    }
    h3 {
      margin-top: 0;
      text-align: center;
      color: #333;
    }
    .bars {
      display: flex;
      height: 150px;
      align-items: flex-end;
      justify-content: space-around;
      padding-top: 20px;
    }
    .bar-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
      width: 30px;
    }
    .bar {
      width: 100%;
      background-color: #3f51b5;
      border-radius: 4px 4px 0 0;
      min-height: 4px;
      transition: height 0.3s;
    }
    .bar.empty {
      background-color: #e0e0e0;
      height: 4px !important;
    }
    .bar.high-score {
      background-color: #ff9800; /* Distinct color for high scores */
    }
    .day-label {
      font-size: 12px;
      color: #666;
      margin-top: 8px;
    }
    .score-label {
      font-size: 12px;
      font-weight: bold;
      color: #333;
      margin-bottom: 4px;
    }
    .no-data {
      text-align: center;
      color: #777;
    }
  `]
})
export class ScoresChartComponent implements OnChanges {
  @Input() scores: DailyScore[] = [];
  
  chartData: { dayOfWeek: string, score: number | null, date: string }[] = [];

  ngOnChanges() {
    this.generateChartData();
  }

  private generateChartData() {
    this.chartData = [];
    const today = new Date();
    
    // Create a map for O(1) lookups
    const scoreMap = new Map<string, number>();
    for (const score of this.scores) {
      scoreMap.set(score.date, score.score);
    }
    
    // Generate array of last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const scoreValue = scoreMap.get(dateStr);
      
      this.chartData.push({
        date: dateStr,
        dayOfWeek: dayName,
        score: scoreValue !== undefined ? scoreValue : null
      });
    }
  }
}
