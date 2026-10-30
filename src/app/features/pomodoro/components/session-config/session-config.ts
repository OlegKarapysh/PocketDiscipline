import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';
import { EngagementType } from '../../../../core/models/engagement-type.enum';
import { SegmentedControl } from '../../../../shared/components/segmented-control/segmented-control';
import type { SegmentOption } from '../../../../shared/components/segmented-control/segment-option.model';
import { ENGAGEMENT_TYPE_LABELS } from '../../constants/engagement-type-labels.const';

const MIN_DURATION_MINUTES = 15;
const MAX_DURATION_MINUTES = 120;
const DURATION_STEP_MINUTES = 5;

@Component({
  selector: 'app-session-config',
  imports: [MatButtonModule, MatIconModule, SegmentedControl],
  templateUrl: './session-config.html',
  styleUrl: './session-config.scss',
})
export class SessionConfig {
  private timerService = inject(PomodoroTimerService);

  readonly isActive = this.timerService.isActive;
  readonly durationMinutes = this.timerService.durationMinutes;
  readonly engagementType = this.timerService.engagementType;

  readonly engagementOptions: readonly SegmentOption<EngagementType>[] = Object.values(EngagementType).map((value) => ({
    value,
    label: ENGAGEMENT_TYPE_LABELS[value],
  }));

  readonly canDecrease = computed(() => this.durationMinutes() > MIN_DURATION_MINUTES);
  readonly canIncrease = computed(() => this.durationMinutes() < MAX_DURATION_MINUTES);

  readonly runningSummary = computed(
    () => `${ENGAGEMENT_TYPE_LABELS[this.engagementType()]} · ${this.durationMinutes()} min`,
  );

  selectEngagement(engagementType: EngagementType): void {
    this.timerService.setConfig({ durationMinutes: this.durationMinutes(), engagementType });
  }

  // A restored session may have run for a length off the 5-minute grid; a step lands back on it.
  decrease(): void {
    const step = DURATION_STEP_MINUTES;
    this.setDuration(Math.ceil(this.durationMinutes() / step) * step - step);
  }

  increase(): void {
    const step = DURATION_STEP_MINUTES;
    this.setDuration(Math.floor(this.durationMinutes() / step) * step + step);
  }

  private setDuration(minutes: number): void {
    const durationMinutes = Math.min(MAX_DURATION_MINUTES, Math.max(MIN_DURATION_MINUTES, minutes));
    this.timerService.setConfig({ durationMinutes, engagementType: this.engagementType() });
  }
}
