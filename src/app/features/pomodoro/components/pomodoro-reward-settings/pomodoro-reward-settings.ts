import { Component, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { catchError, from, of } from 'rxjs';
import { EngagementType } from '../../../../core/models/engagement-type.enum';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { moneyAmount } from '../../../../shared/validators/money-amount';
import type { PomodoroRewardRates } from '../../models/pomodoro-reward-rates.type';
import { DEFAULT_RATES, PomodoroRewardRateService } from '../../services/pomodoro-reward-rate.service';
import { ENGAGEMENT_TYPE_LABELS } from '../../constants/engagement-type-labels.const';

type RewardRatesModel = Record<EngagementType, number | null>;

const NO_RATES: RewardRatesModel = { [EngagementType.WORK]: null, [EngagementType.STUDY]: null };

@Component({
  selector: 'app-pomodoro-reward-settings',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule, SectionCard],
  templateUrl: './pomodoro-reward-settings.html',
  styleUrl: './pomodoro-reward-settings.scss',
})
export class PomodoroRewardSettings {
  private readonly rewardRates = inject(PomodoroRewardRateService);
  private readonly snackBar = inject(SnackBarService);

  readonly labels = ENGAGEMENT_TYPE_LABELS;
  readonly isSaving = signal(false);

  readonly rates = toSignal(
    from(this.rewardRates.rates$).pipe(
      catchError((err: unknown) => {
        this.snackBar.error(err, 'Failed to load pomodoro rewards');
        return of(DEFAULT_RATES);
      }),
    ),
  );

  // A change made elsewhere (another tab, a purge) replaces the fields unless the user is editing them.
  readonly model = linkedSignal<PomodoroRewardRates | undefined, RewardRatesModel>({
    source: this.rates,
    computation: (rates, previous) => (previous && this.isEdited(previous) ? previous.value : (rates ?? NO_RATES)),
  });

  readonly ratesForm = form(this.model, (path) => {
    moneyAmount(path[EngagementType.WORK], 'Work reward');
    moneyAmount(path[EngagementType.STUDY], 'Study reward');
  });

  async save(): Promise<void> {
    const rates = this.model();
    if (this.ratesForm().invalid() || this.isSaving() || !this.isFilledIn(rates)) {
      return;
    }

    this.isSaving.set(true);
    try {
      await this.rewardRates.saveRates(rates);
      this.snackBar.show('Pomodoro rewards saved.');
    } catch (error) {
      this.snackBar.error(error, 'Failed to save pomodoro rewards.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private isEdited({ source, value }: { source: PomodoroRewardRates | undefined; value: RewardRatesModel }): boolean {
    return source !== undefined && Object.values(EngagementType).some((type) => value[type] !== source[type]);
  }

  // The form's required() rule already guarantees this; the guard narrows the type.
  private isFilledIn(rates: RewardRatesModel): rates is PomodoroRewardRates {
    return Object.values(EngagementType).every(
      (type) => typeof rates[type] === 'number' && Number.isFinite(rates[type]),
    );
  }
}
