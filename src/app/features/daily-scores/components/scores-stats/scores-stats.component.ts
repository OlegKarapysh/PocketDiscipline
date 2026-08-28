import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyScore } from '../../models/daily-score.model';

const DEFAULT_AVERAGE = 0;
const DEFAULT_STREAK = 0;
const DECIMAL_ROUNDING_FACTOR = 10;
const DATE_LOCALE_CA = 'en-CA';
const YESTERDAY_OFFSET = 1;

@Component({
  selector: 'app-scores-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scores-stats.component.html',
  styleUrl: './scores-stats.component.scss',
})
export class ScoresStatsComponent implements OnChanges {
  @Input() monthlyScores: DailyScore[] = [];
  @Input() latestScore: DailyScore | null = null;
  
  monthlyAverage = DEFAULT_AVERAGE;
  currentStreak = DEFAULT_STREAK;

  ngOnChanges() {
    this.calculateStats();
  }

  private calculateStats() {
    if (this.monthlyScores.length > 0) {
      const sum = this.monthlyScores.reduce((acc, curr) => acc + curr.score, 0);
      this.monthlyAverage = Math.round((sum / this.monthlyScores.length) * DECIMAL_ROUNDING_FACTOR) / DECIMAL_ROUNDING_FACTOR;
    } else {
      this.monthlyAverage = DEFAULT_AVERAGE;
    }

    if (this.latestScore) {
      const today = new Date();
      const todayStr = today.toLocaleDateString(DATE_LOCALE_CA);
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - YESTERDAY_OFFSET);
      const yesterdayStr = yesterday.toLocaleDateString(DATE_LOCALE_CA);

      if (this.latestScore.date === todayStr || this.latestScore.date === yesterdayStr) {
        this.currentStreak = this.latestScore.streakAtThisDay;
      } else {
        this.currentStreak = DEFAULT_STREAK;
      }
    } else {
      this.currentStreak = DEFAULT_STREAK;
    }
  }
}
