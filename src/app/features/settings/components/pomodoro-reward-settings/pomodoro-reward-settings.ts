import { Component, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormField, form } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { EMPTY, catchError, from } from 'rxjs';
import { EngagementType } from '../../../../core/models/engagement-type.enum';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { moneyAmount } from '../../../../shared/validators/money-amount';
import { PomodoroRewardRateService } from '../../../pomodoro/services/pomodoro-reward-rate.service';

interface RewardRatesModel {
  work: number | null;
  study: number | null;
}

@Component({
  selector: 'app-pomodoro-reward-settings',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule, SectionCard],
  templateUrl: './pomodoro-reward-settings.html',
  styleUrl: './pomodoro-reward-settings.scss',
})
export class PomodoroRewardSettings {
  private readonly rewardRates = inject(PomodoroRewardRateService);
  private readonly snackBar = inject(SnackBarService);

  readonly isSaving = signal(false);

  readonly rates = toSignal(
    from(this.rewardRates.rates$).pipe(
      catchError((err: unknown) => {
        this.snackBar.error(err, 'Failed to load pomodoro rewards');
        return EMPTY;
      }),
    ),
    { initialValue: undefined },
  );

  readonly model = linkedSignal<RewardRatesModel>(() => {
    const rates = this.rates();
    return { work: rates?.[EngagementType.WORK] ?? null, study: rates?.[EngagementType.STUDY] ?? null };
  });

  readonly ratesForm = form(this.model, (path) => {
    moneyAmount(path.work, 'Work reward');
    moneyAmount(path.study, 'Study reward');
  });

  async save(): Promise<void> {
    const { work, study } = this.model();
    if (this.ratesForm().invalid() || this.isSaving() || work === null || study === null) {
      return;
    }

    this.isSaving.set(true);
    try {
      await this.rewardRates.saveRates({ [EngagementType.WORK]: work, [EngagementType.STUDY]: study });
      this.snackBar.show('Pomodoro rewards saved.');
    } catch (error) {
      this.snackBar.error(error, 'Failed to save pomodoro rewards.');
    } finally {
      this.isSaving.set(false);
    }
  }
}
