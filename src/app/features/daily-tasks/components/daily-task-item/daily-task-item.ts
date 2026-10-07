import { Component, input, output, computed, inject } from '@angular/core';
import { ClockService } from '../../../../core/services/clock.service';
import { DATE_LOCALE_CA } from '../../../../core/constants/date-locale.const';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Amount } from '../../../../shared/components/amount/amount';
import { StreakBadge } from '../../../../shared/components/streak-badge/streak-badge';
import type { DailyTask } from '../../../../core/models/daily-task.model';
import type { DailyTaskDifficulty } from '../../../../core/models/daily-task-difficulty.model';

@Component({
  imports: [MatCardModule, MatButtonModule, MatIconModule, Amount, StreakBadge],
  selector: 'app-daily-task-item',
  styleUrl: './daily-task-item.scss',
  templateUrl: './daily-task-item.html',
})
export class DailyTaskItem {
  task = input.required<DailyTask>();
  complete = output<DailyTaskDifficulty>();
  edit = output<DailyTask>();
  delete = output<DailyTask>();

  private readonly clock = inject(ClockService);

  isCompletedToday = computed(() => {
    const lastCompletedAt = this.task().lastCompletedAt;
    if (!lastCompletedAt) return false;
    return new Date(lastCompletedAt).toLocaleDateString(DATE_LOCALE_CA) === this.clock.today();
  });
}
