import { Component, input, output } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Goal } from '../../models/goal.model';

@Component({
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  selector: 'app-goal-item',
  styleUrl: './goal-item.scss',
  templateUrl: './goal-item.html',
})
export class GoalItem {
  goal = input.required<Goal>();
  complete = output<string>();
  undo = output<string>();
  edit = output<Goal>();
  delete = output<string>();
}
