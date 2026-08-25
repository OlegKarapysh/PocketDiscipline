import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DailyTaskDifficulty } from '../../models/daily-task.model';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-daily-task-form',
  templateUrl: './daily-task-form.component.html',
  styleUrl: './daily-task-form.component.scss'
})
export class DailyTaskFormComponent {
  @Output() taskCreated = new EventEmitter<{title: string, difficulties: DailyTaskDifficulty[]}>();
  @Output() cancel = new EventEmitter<void>();

  title: string = '';
  difficulties: DailyTaskDifficulty[] = [
    { id: 'easy', name: 'Easy', baseReward: 100 },
    { id: 'medium', name: 'Medium', baseReward: 200 },
    { id: 'hard', name: 'Hard', baseReward: 300 }
  ];

  addDifficulty() {
    this.difficulties.push({
      id: crypto.randomUUID(),
      name: 'New Difficulty',
      baseReward: 100
    });
  }

  removeDifficulty(index: number) {
    if (this.difficulties.length > 1) {
      this.difficulties.splice(index, 1);
    }
  }

  submit() {
    if (this.title.trim() && this.difficulties.length > 0) {
      this.taskCreated.emit({
        title: this.title.trim(),
        difficulties: [...this.difficulties]
      });
      this.title = '';
    }
  }
}
