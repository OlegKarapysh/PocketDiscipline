import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScoreInputComponent } from '../components/score-input/score-input.component';
import { ScoresChartComponent } from '../components/scores-chart/scores-chart.component';
import { ScoresStatsComponent } from '../components/scores-stats/scores-stats.component';
import { DailyScoresService } from '../services/daily-scores.service';
import { DailyScore } from '../models/daily-score.model';
import { forkJoin } from 'rxjs';

const CURRENCY_SYMBOL = '₴';
const MSG_SCORE_SAVED_NO_REWARD = 'Score saved! Aim for a 9 or 10 tomorrow to earn rewards!';
const ERROR_FAILED_SAVE_SCORE = 'Failed to save score';

@Component({
  selector: 'app-daily-scores-page',
  standalone: true,
  imports: [CommonModule, ScoreInputComponent, ScoresChartComponent, ScoresStatsComponent],
  templateUrl: './daily-scores-page.component.html',
  styleUrl: './daily-scores-page.component.scss',
})
export class DailyScoresPageComponent implements OnInit {
  private dailyScoresService = inject(DailyScoresService);
  
  loading = true;
  hasScoreToday = false;
  currentScore: number | null = null;
  successMessage: string | null = null;
  
  monthlyScores: DailyScore[] = [];
  weeklyScores: DailyScore[] = [];
  latestScore: DailyScore | null = null;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading = true;
    
    forkJoin({
      todayScore: this.dailyScoresService.getTodayScore(),
      monthlyScores: this.dailyScoresService.getCurrentMonthScores(),
      weeklyScores: this.dailyScoresService.getLast7DaysScores()
    }).subscribe({
      next: (results) => {
        if (results.todayScore) {
          this.hasScoreToday = true;
          this.currentScore = results.todayScore.score;
        } else {
          this.hasScoreToday = false;
          this.currentScore = null;
        }
        
        this.monthlyScores = results.monthlyScores;
        this.weeklyScores = results.weeklyScores;
        
        if (results.weeklyScores.length > 0) {
          this.latestScore = results.weeklyScores.reduce((prev, curr) => (prev.date > curr.date) ? prev : curr);
        }
        
        this.loading = false;
      },
      error: (e) => {
        console.error(e);
        this.loading = false;
      }
    });
  }

  async onScoreSubmit(score: number) {
    this.loading = true;
    this.successMessage = null;
    
    try {
      const result = await this.dailyScoresService.saveTodayScore(score);
      if (result.reward > 0) {
        this.successMessage = `Awesome! You earned ${result.reward}${CURRENCY_SYMBOL}. Current high score streak: ${result.newStreak}`;
      } else {
        this.successMessage = MSG_SCORE_SAVED_NO_REWARD;
      }
      this.loadData();
    } catch (e) {
      console.error(ERROR_FAILED_SAVE_SCORE, e);
      this.loading = false;
    }
  }
}
