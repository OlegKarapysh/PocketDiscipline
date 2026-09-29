import { Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import type { StatTone } from './stat-tone.type';

@Component({
  selector: 'app-stat-card',
  imports: [MatCardModule],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
})
export class StatCard {
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly hintTone = input<StatTone>('neutral');
}
