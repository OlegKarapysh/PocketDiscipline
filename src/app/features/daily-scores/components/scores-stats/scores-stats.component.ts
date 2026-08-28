import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyScore } from '../../models/daily-score.model';

@Component({
  selector: 'app-scores-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stats-container">
      <div class="stat-card">
        <div class="stat-title">Month Avg</div>
        <div class="stat-value" [class.no-data]="monthlyAverage === 0">
          {{ monthlyAverage > 0 ? monthlyAverage : '-' }}
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-title">Current Streak</div>
        <div class="stat-value streak" [class.active]="currentStreak > 0">
          {{ currentStreak }}
        </div>
        <div class="stat-subtitle">High Scores</div>
      </div>
    </div>
  `,
  styles: [`
    .stats-container {
      display: flex;
      gap: 16px;
      margin-top: 16px;
      justify-content: center;
    }
    .stat-card {
      background: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      flex: 1;
      max-width: 200px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .stat-title {
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
      font-weight: 500;
    }
    .stat-value {
      font-size: 36px;
      font-weight: bold;
      color: #3f51b5;
      margin: 8px 0;
    }
    .stat-value.no-data {
      color: #ccc;
    }
    .stat-value.streak.active {
      color: #ff9800;
    }
    .stat-subtitle {
      font-size: 12px;
      color: #888;
    }
  `]
})
export class ScoresStatsComponent implements OnChanges {
  @Input() monthlyScores: DailyScore[] = [];
  @Input() latestScore: DailyScore | null = null;
  
  monthlyAverage = 0;
  currentStreak = 0;

  ngOnChanges() {
    this.calculateStats();
  }

  private calculateStats() {
    if (this.monthlyScores.length > 0) {
      const sum = this.monthlyScores.reduce((acc, curr) => acc + curr.score, 0);
      this.monthlyAverage = Math.round((sum / this.monthlyScores.length) * 10) / 10;
    } else {
      this.monthlyAverage = 0;
    }

    if (this.latestScore) {
      // If the latest score is from today or yesterday, show its streak.
      // If it's older than yesterday, the streak is lost (0).
      const today = new Date();
      const todayStr = today.toLocaleDateString('en-CA');
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString('en-CA');

      if (this.latestScore.date === todayStr || this.latestScore.date === yesterdayStr) {
        this.currentStreak = this.latestScore.streakAtThisDay;
      } else {
        this.currentStreak = 0;
      }
    } else {
      this.currentStreak = 0;
    }
  }
}
