import { Component, input, linkedSignal, output } from '@angular/core';
import type { CdkDragDrop } from '@angular/cdk/drag-drop';
import { CdkDrag, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import type { DailyTask } from '../../../../core/models/daily-task.model';

// Dragging needs a pointer, so every row also has up and down buttons for the keyboard.
@Component({
  imports: [CdkDropList, CdkDrag, CdkDragHandle, MatCardModule, MatButtonModule, MatIconModule],
  selector: 'app-daily-task-reorder-list',
  templateUrl: './daily-task-reorder-list.html',
  styleUrl: './daily-task-reorder-list.scss',
})
export class DailyTaskReorderList {
  readonly tasks = input.required<DailyTask[]>();
  // The ids in their new order, after every move.
  readonly reorder = output<string[]>();

  // Shows a move straight away; the next emission of the tasks, once it is saved, replaces it.
  readonly order = linkedSignal(() => this.tasks());

  drop(event: CdkDragDrop<DailyTask[]>): void {
    this.move(event.previousIndex, event.currentIndex);
  }

  move(from: number, to: number): void {
    if (from === to) return;
    const order = [...this.order()];
    moveItemInArray(order, from, to);
    this.order.set(order);
    this.reorder.emit(order.map((task) => task.id));
  }
}
