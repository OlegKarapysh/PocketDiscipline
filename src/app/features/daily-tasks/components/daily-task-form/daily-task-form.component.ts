import { Component, output } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DailyTaskDifficulty } from '../../models/daily-task.model';

@Component({
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  selector: 'app-daily-task-form',
  templateUrl: './daily-task-form.component.html',
  styleUrl: './daily-task-form.component.scss',
})
export class DailyTaskFormComponent {
  taskCreated = output<{ title: string; difficulties: DailyTaskDifficulty[] }>();
  cancelForm = output<void>();

  title = '';
  difficulties: DailyTaskDifficulty[] = [
    { id: 'easy', name: 'Easy', baseReward: 100 },
    { id: 'medium', name: 'Medium', baseReward: 200 },
    { id: 'hard', name: 'Hard', baseReward: 300 },
  ];

  addDifficulty() {
    this.difficulties.push({
      id: crypto.randomUUID(),
      name: 'New Difficulty',
      baseReward: 100,
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
        difficulties: [...this.difficulties],
      });
      this.title = '';
    }
  }
}
