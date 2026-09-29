import { Component, input } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-progress-ring',
  imports: [MatProgressSpinnerModule],
  templateUrl: './progress-ring.html',
  styleUrl: './progress-ring.scss',
})
export class ProgressRing {
  readonly value = input.required<number>();
  readonly diameter = input(84);
  readonly strokeWidth = input(8);
}
