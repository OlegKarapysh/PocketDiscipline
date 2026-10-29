import { Component, input, output, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { Amount } from '../../../../shared/components/amount/amount';
import { StreakBadge } from '../../../../shared/components/streak-badge/streak-badge';
import type { DailyTask } from '../../../../core/models/daily-task.model';
import type { DailyTaskDifficulty } from '../../../../core/models/daily-task-difficulty.model';
import type { DifficultyReward } from '../../models/difficulty-reward.model';

// One compact row that opens to show the difficulties. The list decides which row is open and
// whether the task is done today.
@Component({
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatRippleModule, Amount, StreakBadge],
  selector: 'app-daily-task-item',
  styleUrl: './daily-task-item.scss',
  templateUrl: './daily-task-item.html',
})
export class DailyTaskItem {
  task = input.required<DailyTask>();
  completed = input(false);
  expanded = input(false);
  // What each difficulty pays if the task is completed now; only a pending task has any.
  rewards = input<DifficultyReward[]>([]);
  // What today's completion earned; null while the task is pending, or if no completion was found.
  earned = input<number | null>(null);
  expandedChange = output<boolean>();
  complete = output<DailyTaskDifficulty>();
  edit = output<DailyTask>();

  // Null when no difficulty pays anything.
  rewardRange = computed(() => {
    const rewards = this.rewards()
      .map((r) => r.reward)
      .filter((reward) => reward !== null);
    return rewards.length > 0 ? { min: Math.min(...rewards), max: Math.max(...rewards) } : null;
  });

  detailsId = computed(() => `daily-task-${this.task().id}-details`);
}
