import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SectionCard } from '../../../../shared/components/section-card/section-card';
import type { ScoreTier } from '../../models/score-tier.model';

const SCORE_TIERS: ScoreTier[] = [
  {
    minScore: 1,
    maxScore: 3,
    label: 'Low discipline',
    description: 'Tough day. Acknowledge it and reset for tomorrow.',
    icon: 'battery_alert',
    badgeClass: 'tier-low',
  },
  {
    minScore: 4,
    maxScore: 6,
    label: 'Moderate discipline',
    description: 'Steady progress. Kept things moving forward.',
    icon: 'trending_flat',
    badgeClass: 'tier-moderate',
  },
  {
    minScore: 7,
    maxScore: 8,
    label: 'Good discipline',
    description: 'Strong day. Maintained focus and completed key habits.',
    icon: 'check_circle',
    badgeClass: 'tier-good',
  },
  {
    minScore: 9,
    maxScore: 10,
    label: 'Exceptional discipline',
    description: 'Flawless execution. You crushed every objective.',
    icon: 'workspace_premium',
    badgeClass: 'tier-exceptional',
  },
];

@Component({
  selector: 'app-score-input',
  imports: [MatButtonModule, MatIconModule, SectionCard],
  templateUrl: './score-input.html',
  styleUrl: './score-input.scss',
})
export class ScoreInput {
  readonly readonly = input<boolean>(false);
  readonly selectedScore = input<number | null>(null);
  readonly scoreSubmitted = output<number>();

  // Two rows of five, which the stylesheet puts side by side where ten buttons fit in one row.
  readonly scoreRows = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
  ];
  readonly internalSelectedScore = linkedSignal<number | null>(() => this.selectedScore());

  readonly activeTier = computed<ScoreTier | null>(() => {
    const score = this.internalSelectedScore();
    if (score === null) {
      return null;
    }
    return SCORE_TIERS.find((tier) => score >= tier.minScore && score <= tier.maxScore) ?? null;
  });

  selectScore(score: number): void {
    if (!this.readonly()) {
      this.internalSelectedScore.set(score);
    }
  }

  submit(): void {
    const score = this.internalSelectedScore();
    if (score !== null) {
      this.scoreSubmitted.emit(score);
    }
  }
}
