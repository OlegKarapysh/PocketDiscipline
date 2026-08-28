import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScoreInputComponent } from '../components/score-input/score-input.component';
import { ScoresChartComponent } from '../components/scores-chart/scores-chart.component';
import { ScoresStatsComponent } from '../components/scores-stats/scores-stats.component';
import { DailyScoresService } from '../services/daily-scores.service';
import { DailyScore } from '../models/daily-score.model';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-daily-scores-page',
  standalone: true,
  imports: [CommonModule, ScoreInputComponent, ScoresChartComponent, ScoresStatsComponent],
  template: `
    <div class="page-container">
      <h1>Daily Scores</h1>
      
      @if (loading) {
        <div class="loading-state">
          Loading...
        </div>
      }

      @if (!loading) {
        <div>
          <app-scores-stats 
            [monthlyScores]="monthlyScores" 
            [latestScore]="latestScore">
          </app-scores-stats>

          <app-scores-chart [scores]="weeklyScores"></app-scores-chart>

          <app-score-input 
            [readonly]="hasScoreToday"
            [selectedScore]="currentScore"
            (scoreSubmitted)="onScoreSubmit($event)">
          </app-score-input>
          
          @if (successMessage) {
            <div class="success-message">
              {{ successMessage }}
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container {
      padding: 16px;
    }
    .loading-state {
      padding: 24px;
      text-align: center;
    }
    .success-message {
      margin-top: 24px;
      padding: 16px;
      background-color: #4caf50;
      color: white;
      border-radius: 8px;
      text-align: center;
      font-weight: 500;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }
  `]
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
        this.successMessage = `Awesome! You earned ${result.reward}₴. Current high score streak: ${result.newStreak}`;
      } else {
        this.successMessage = 'Score saved! Aim for a 9 or 10 tomorrow to earn rewards!';
      }
      this.loadData();
    } catch (e) {
      console.error('Failed to save score', e);
      this.loading = false;
    }
  }
}
