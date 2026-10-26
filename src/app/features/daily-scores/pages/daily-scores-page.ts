import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { ScoreInput } from '../components/score-input/score-input';
import { ScoresChart } from '../components/scores-chart/scores-chart';
import { ScoresStats } from '../components/scores-stats/scores-stats';
import { DailyScoresService } from '../services/daily-scores.service';
import type { DailyScore } from '../../../core/models/daily-score.model';
import { EMPTY, Subject, catchError, forkJoin, map, merge, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ClockService } from '../../../core/services/clock.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PeriodFilter } from '../../../shared/components/period-filter/period-filter';
import type { PeriodFilterValue } from '../../../shared/components/period-filter/period-filter-value.model';
import { formatPeriodLabel, getPresetDateRange } from '../../../shared/components/period-filter/preset-date-range';
import { MONEY_FORMAT } from '../../../shared/constants/money-format.const';

@Component({
  selector: 'app-daily-scores-page',
  imports: [PageHeader, PeriodFilter, ScoreInput, ScoresChart, ScoresStats, MatProgressSpinnerModule],
  templateUrl: './daily-scores-page.html',
  styleUrl: './daily-scores-page.scss',
})
export class DailyScoresPage {
  private dailyScoresService = inject(DailyScoresService);
  private clock = inject(ClockService);
  private destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();
  private readonly filterReload = new Subject<PeriodFilterValue>();

  private readonly selectedFilter = signal<PeriodFilterValue>({ preset: 'last7', startDate: '', endDate: '' });

  readonly currentFilter = computed<PeriodFilterValue>(() => {
    const filter = this.selectedFilter();
    if (filter.preset === 'custom') {
      return filter;
    }

    const today = this.clock.today();
    return { preset: filter.preset, ...getPresetDateRange(filter.preset, today) };
  });

  readonly periodLabel = computed<string>(() => formatPeriodLabel(this.currentFilter()));

  loading = signal<boolean>(true);
  hasScoreToday = signal<boolean>(false);
  currentScore = signal<number | null>(null);
  successMessage = signal<string | null>(null);

  periodScores = signal<DailyScore[]>([]);
  latestScore = signal<DailyScore | null>(null);

  constructor() {
    // Everything on this page is relative to today, so a new day reloads it like an explicit reload.
    merge(
      merge(toObservable(this.clock.today), this.reload).pipe(
        tap(() => {
          this.loading.set(true);
        }),
        map(() => ({ filter: this.currentFilter(), fullReload: true })),
      ),
      this.filterReload.pipe(map((filter) => ({ filter, fullReload: false }))),
    )
      .pipe(
        // switchMap, not a stored Subscription: reloading cancels the in-flight load.
        switchMap(({ filter, fullReload }) => {
          if (!fullReload) {
            return this.dailyScoresService.getScoresInRange(filter.startDate, filter.endDate).pipe(
              map((periodScores) => ({ fullReload: false as const, periodScores })),
              catchError((e: unknown) => {
                console.error(e);
                return EMPTY;
              }),
            );
          }

          return forkJoin({
            todayScore: this.dailyScoresService.getTodayScore(),
            periodScores: this.dailyScoresService.getScoresInRange(filter.startDate, filter.endDate),
            recentScores: this.dailyScoresService.getLast7DaysScores(),
          }).pipe(
            map((results) => ({ fullReload: true as const, ...results })),
            catchError((e: unknown) => {
              console.error(e);
              this.loading.set(false);
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        if (!results.fullReload) {
          this.periodScores.set(results.periodScores);
          return;
        }

        if (results.todayScore) {
          this.hasScoreToday.set(true);
          this.currentScore.set(results.todayScore.score);
        } else {
          this.hasScoreToday.set(false);
          this.currentScore.set(null);
        }

        this.periodScores.set(results.periodScores);

        if (results.recentScores.length > 0) {
          const latest = results.recentScores.reduce((prev, curr) => (prev.date > curr.date ? prev : curr));
          this.latestScore.set(latest);
        } else {
          this.latestScore.set(null);
        }

        this.loading.set(false);
      });
  }

  loadData() {
    this.reload.next();
  }

  onFilterChange(filter: PeriodFilterValue): void {
    this.selectedFilter.set(filter);
    this.filterReload.next(this.currentFilter());
  }

  async onScoreSubmit(score: number) {
    this.loading.set(true);
    this.successMessage.set(null);

    try {
      const result = await this.dailyScoresService.saveTodayScore(score);
      if (result.reward > 0) {
        this.successMessage.set(
          `Score saved. You earned ${MONEY_FORMAT.format(result.reward)} ₴. High-score streak: ${result.newStreak}`,
        );
      } else {
        this.successMessage.set('Score saved. Aim for a 9 or 10 tomorrow to earn rewards.');
      }
      this.loadData();
    } catch (e) {
      console.error('Failed to save score', e);
      this.loading.set(false);
    }
  }
}
