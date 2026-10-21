import { Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Amount } from '../../../../shared/components/amount/amount';
import type { DisciplineItem } from '../../../../core/models/discipline-item.model';

@Component({
  imports: [MatCardModule, MatButtonModule, MatIconModule, Amount],
  selector: 'app-task-item',
  templateUrl: './task-item.html',
  styleUrl: './task-item.scss',
})
export class TaskItem {
  readonly task = input.required<DisciplineItem>();
  readonly complete = output<DisciplineItem>();
  readonly undo = output<DisciplineItem>();
  readonly edit = output<DisciplineItem>();
  readonly delete = output<DisciplineItem>();
}
