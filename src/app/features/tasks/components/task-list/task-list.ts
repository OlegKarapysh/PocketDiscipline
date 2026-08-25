import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { TaskService } from '../../../../core/services/task.service';
import { DisciplineItem } from '../../../../core/models/data-models';
import { Observable, from } from 'rxjs';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatListModule, 
    MatCheckboxModule, 
    MatButtonModule, 
    MatIconModule,
    MatChipsModule
  ],
  templateUrl: './task-list.html',
  styleUrls: ['./task-list.scss']
})
export class TaskListComponent {
  taskService = inject(TaskService);
  tasks$ = from(this.taskService.tasks$ as any) as Observable<DisciplineItem[]>;

  completeTask(task: DisciplineItem) {
    if (!task.isCompleted) {
      this.taskService.completeTask(task.id);
    }
  }

  addDummyTask() {
    this.taskService.addTask('Drink 2L Water', 'HABIT', 10);
    this.taskService.addTask('Read 10 pages', 'HABIT', 20);
    this.taskService.addTask('Pay internet bill', 'ONEOFF', 5);
  }
}
