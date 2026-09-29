import { Component, effect, inject, linkedSignal, untracked } from '@angular/core';
import { FormField, form, max, min, required } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';
import { EngagementType } from '../../../../core/models/engagement-type.enum';
import type { TimerConfig } from '../../models/timer-config.model';

const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 120;

@Component({
  selector: 'app-session-config',
  imports: [FormField, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './session-config.html',
  styleUrl: './session-config.scss',
})
export class SessionConfig {
  private timerService = inject(PomodoroTimerService);

  readonly engagementTypeWork = EngagementType.WORK;
  readonly engagementTypeStudy = EngagementType.STUDY;
  readonly durationRangeHint = `Choose ${MIN_DURATION_MINUTES}–${MAX_DURATION_MINUTES} minutes`;

  readonly isActive = this.timerService.isActive;

  readonly config = linkedSignal<TimerConfig>(() => ({
    durationMinutes: this.timerService.durationMinutes(),
    engagementType: this.timerService.engagementType(),
  }));

  readonly configForm = form(this.config, (path) => {
    required(path.durationMinutes);
    min(path.durationMinutes, MIN_DURATION_MINUTES);
    max(path.durationMinutes, MAX_DURATION_MINUTES);
  });

  constructor() {
    // The timer service owns the config; the form pushes a draft back only once it is valid.
    effect(() => {
      const draft = this.config();
      if (!this.configForm().valid()) return;
      untracked(() => {
        if (
          draft.durationMinutes !== this.timerService.durationMinutes() ||
          draft.engagementType !== this.timerService.engagementType()
        ) {
          this.timerService.setConfig(draft);
        }
      });
    });
  }
}
