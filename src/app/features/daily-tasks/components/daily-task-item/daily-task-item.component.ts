import { Component, input, output, computed } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

import { DailyTask, DailyTaskDifficulty } from '../../models/daily-task.model';

@Component({
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatChipsModule],
  selector: 'app-daily-task-item',
  styleUrl: './daily-task-item.component.scss',
  templateUrl: './daily-task-item.component.html',
})
export class DailyTaskItemComponent {
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
