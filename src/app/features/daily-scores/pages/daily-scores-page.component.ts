import { Component, OnInit, inject, signal } from '@angular/core';
import { ScoreInputComponent } from '../components/score-input/score-input.component';
import { ScoresChartComponent } from '../components/scores-chart/scores-chart.component';
import { ScoresStatsComponent } from '../components/scores-stats/scores-stats.component';
import { DailyScoresService } from '../services/daily-scores.service';
import { DailyScore } from '../models/daily-score.model';
import { forkJoin } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const CURRENCY_SYMBOL = '₴';
const MSG_SCORE_SAVED_NO_REWARD = 'Score saved! Aim for a 9 or 10 tomorrow to earn rewards!';
const ERROR_FAILED_SAVE_SCORE = 'Failed to save score';
const EMPTY_LENGTH = 0;

@Component({
  selector: 'app-daily-scores-page',
  imports: [ScoreInputComponent, ScoresChartComponent, ScoresStatsComponent, MatProgressSpinnerModule],
  templateUrl: './daily-scores-page.component.html',
  styleUrl: './daily-scores-page.component.scss',
})
export class DailyScoresPageComponent implements OnInit {
  private dailyScoresService = inject(DailyScoresService);

  loading = signal<boolean>(true);
  hasScoreToday = signal<boolean>(false);
  currentScore = signal<number | null>(null);
  successMessage = signal<string | null>(null);

  monthlyScores = signal<DailyScore[]>([]);
  weeklyScores = signal<DailyScore[]>([]);
  latestScore = signal<DailyScore | null>(null);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);

    forkJoin({
      todayScore: this.dailyScoresService.getTodayScore(),
      monthlyScores: this.dailyScoresService.getCurrentMonthScores(),
      weeklyScores: this.dailyScoresService.getLast7DaysScores()
    }).subscribe({
      next: (results) => {
        if (results.todayScore) {
          this.hasScoreToday.set(true);
          this.currentScore.set(results.todayScore.score);
        } else {
          this.hasScoreToday.set(false);
          this.currentScore.set(null);
        }

        this.monthlyScores.set(results.monthlyScores);
        this.weeklyScores.set(results.weeklyScores);

        if (results.weeklyScores.length > EMPTY_LENGTH) {
          const latest = results.weeklyScores.reduce((prev, curr) => (prev.date > curr.date) ? prev : curr);
          this.latestScore.set(latest);
        } else {
          this.latestScore.set(null);
        }

        this.loading.set(false);
      },
      error: (e) => {
        console.error(e);
        this.loading.set(false);
      }
    });
  }

  async onScoreSubmit(score: number) {
    this.loading.set(true);
    this.successMessage.set(null);

    try {
      const result = await this.dailyScoresService.saveTodayScore(score);
      if (result.reward > EMPTY_LENGTH) {
        this.successMessage.set(`Awesome! You earned ${result.reward}${CURRENCY_SYMBOL}. Current high score streak: ${result.newStreak}`);
      } else {
        this.successMessage.set(MSG_SCORE_SAVED_NO_REWARD);
      }
      this.loadData();
    } catch (e) {
      console.error(ERROR_FAILED_SAVE_SCORE, e);
      this.loading.set(false);
    }
  }
}

