import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { TaskService } from '../../../../core/services/task.service';
import { DisciplineItem } from '../../../../core/models/discipline-item.model';
import { DisciplineItemType } from '../../../../core/models/discipline-item-type.enum';
import { Observable, from } from 'rxjs';

const DUMMY_TASK_WATER = {
  title: 'Drink 2L Water',
  type: DisciplineItemType.HABIT,
  reward: 10,
};
const DUMMY_TASK_READ = {
  title: 'Read 10 pages',
  type: DisciplineItemType.HABIT,
  reward: 20,
};
const DUMMY_TASK_BILL = {
  title: 'Pay internet bill',
  type: DisciplineItemType.ONEOFF,
  reward: 5,
};

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
  styleUrl: './task-list.scss'
})
export class TaskListComponent {
  taskService = inject(TaskService);
  tasks$ = from(this.taskService.tasks$) as Observable<DisciplineItem[]>;

  completeTask(task: DisciplineItem) {
    if (!task.isCompleted) {
      this.taskService.completeTask(task.id);
    }
  }

  addDummyTask() {
    this.taskService.addTask(DUMMY_TASK_WATER.title, DUMMY_TASK_WATER.type, DUMMY_TASK_WATER.reward);
    this.taskService.addTask(DUMMY_TASK_READ.title, DUMMY_TASK_READ.type, DUMMY_TASK_READ.reward);
    this.taskService.addTask(DUMMY_TASK_BILL.title, DUMMY_TASK_BILL.type, DUMMY_TASK_BILL.reward);
  }
}
