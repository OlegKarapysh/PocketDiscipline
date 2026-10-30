import { Component, computed, input } from '@angular/core';
import { EngagementType } from '../../../../core/models/engagement-type.enum';
import { Amount } from '../../../../shared/components/amount/amount';
import { Badge } from '../../../../shared/components/badge/badge';
import { ENGAGEMENT_TYPE_LABELS } from '../../constants/engagement-type-labels.const';
import type { PomodoroTally } from '../../models/pomodoro-tally.model';

@Component({
  selector: 'app-pomodoro-stats',
  imports: [Amount, Badge],
  templateUrl: './pomodoro-stats.html',
  styleUrl: './pomodoro-stats.scss',
})
export class PomodoroStats {
  readonly tally = input.required<PomodoroTally>();

  readonly countUnit = computed(() => (this.tally().pomodoros === 1 ? 'pomodoro' : 'pomodoros'));

  readonly split = computed(() =>
    Object.values(EngagementType).map((type) => ({
      type,
      label: ENGAGEMENT_TYPE_LABELS[type],
      count: this.tally().byType[type],
    })),
  );

  readonly focusTime = computed(() => {
    const minutes = this.tally().focusMinutes;
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
  });
}
