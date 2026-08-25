import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DailyTask, DailyTaskDifficulty } from '../../models/daily-task.model';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-daily-task-item',
  styleUrl: './daily-task-item.component.scss',
  templateUrl: './daily-task-item.component.html',
})
export class DailyTaskItemComponent {
  @Input({ required: true }) task!: DailyTask;
  @Output() complete = new EventEmitter<DailyTaskDifficulty>();

  get isCompletedToday(): boolean {
    if (!this.task.lastCompletedAt) return false;
    const today = new Date();
    today.setHours(0,0,0,0);
    return this.task.lastCompletedAt >= today.getTime();
  }
}
