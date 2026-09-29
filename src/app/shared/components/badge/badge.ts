import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import type { BadgeTone } from './badge-tone.type';

@Component({
  selector: 'app-badge',
  imports: [MatIconModule],
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
  host: {
    '[class]': 'toneClass()',
  },
})
export class Badge {
  readonly tone = input<BadgeTone>('neutral');
  readonly icon = input<string>();
  readonly filledIcon = input(true);

  readonly toneClass = computed(() => `tone-${this.tone()}`);
}
