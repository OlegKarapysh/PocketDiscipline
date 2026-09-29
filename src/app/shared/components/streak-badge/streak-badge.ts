import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-streak-badge',
  imports: [MatIconModule],
  templateUrl: './streak-badge.html',
  styleUrl: './streak-badge.scss',
  host: {
    '[class.compact]': 'compact()',
    '[class.inactive]': 'days() === 0',
    title: 'Current streak',
  },
})
export class StreakBadge {
  readonly days = input.required<number>();
  readonly compact = input(false);

  readonly label = computed(() => {
    const days = this.days();
    if (days === 0) return 'Start a streak today';
    return this.compact() ? `${days}` : `${days}-day streak`;
  });
}
