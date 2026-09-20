import type { OnInit} from '@angular/core';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ScoreInput } from '../components/score-input/score-input';
import { ScoresChart } from '../components/scores-chart/scores-chart';
import { ScoresStats } from '../components/scores-stats/scores-stats';
import { DailyScoresService } from '../services/daily-scores.service';
import type { DailyScore } from '../../../core/models/daily-score.model';
import { EMPTY, Subject, catchError, forkJoin, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const CURRENCY_SYMBOL = '₴';
const MSG_SCORE_SAVED_NO_REWARD = 'Score saved! Aim for a 9 or 10 tomorrow to earn rewards!';
const ERROR_FAILED_SAVE_SCORE = 'Failed to save score';
const EMPTY_LENGTH = 0;

@Component({
  selector: 'app-daily-scores-page',
  imports: [ScoreInput, ScoresChart, ScoresStats, MatProgressSpinnerModule],
  templateUrl: './daily-scores-page.html',
  styleUrl: './daily-scores-page.scss',
})
export class DailyScoresPage implements OnInit {
  private dailyScoresService = inject(DailyScoresService);
  private destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();

  loading = signal<boolean>(true);
  hasScoreToday = signal<boolean>(false);
  currentScore = signal<number | null>(null);
  successMessage = signal<string | null>(null);

  monthlyScores = signal<DailyScore[]>([]);
  weeklyScores = signal<DailyScore[]>([]);
  latestScore = signal<DailyScore | null>(null);

  constructor() {
    this.reload
      .pipe(
        tap(() => { this.loading.set(true); }),
        // switchMap, not a stored Subscription: reloading cancels the in-flight load.
        switchMap(() =>
          forkJoin({
            todayScore: this.dailyScoresService.getTodayScore(),
            monthlyScores: this.dailyScoresService.getCurrentMonthScores(),
            weeklyScores: this.dailyScoresService.getLast7DaysScores()
          }).pipe(
            catchError((e: unknown) => {
              console.error(e);
              this.loading.set(false);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((results) => {
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
      });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.reload.next();
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
