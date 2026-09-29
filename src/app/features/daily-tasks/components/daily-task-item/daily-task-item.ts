import { Component, input, output, computed } from '@angular/core';
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

  isCompletedToday = computed(() => {
    const lastCompletedAt = this.task().lastCompletedAt;
    if (!lastCompletedAt) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return lastCompletedAt >= today.getTime();
  });
}
