import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ScoreTier } from '../../models/score-tier.model';

const AVAILABLE_SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const TIER_LOW_MIN = 1;
const TIER_LOW_MAX = 3;
const TIER_MODERATE_MIN = 4;
const TIER_MODERATE_MAX = 6;
const TIER_GOOD_MIN = 7;
const TIER_GOOD_MAX = 8;
const TIER_EXCEPTIONAL_MIN = 9;
const TIER_EXCEPTIONAL_MAX = 10;

const TIER_LOW_LABEL = 'Low Discipline';
const TIER_LOW_DESC = 'Tough day. Acknowledge it and reset for tomorrow.';
const TIER_LOW_ICON = 'battery_alert';
const TIER_LOW_CLASS = 'tier-low';

const TIER_MODERATE_LABEL = 'Moderate Discipline';
const TIER_MODERATE_DESC = 'Steady progress. Kept things moving forward.';
const TIER_MODERATE_ICON = 'trending_flat';
const TIER_MODERATE_CLASS = 'tier-moderate';

const TIER_GOOD_LABEL = 'Good Discipline';
const TIER_GOOD_DESC = 'Strong day! Maintained focus and completed key habits.';
const TIER_GOOD_ICON = 'thumb_up';
const TIER_GOOD_CLASS = 'tier-good';

const TIER_EXCEPTIONAL_LABEL = 'Exceptional Discipline';
const TIER_EXCEPTIONAL_DESC = 'Outstanding performance! Crushed your goals.';
const TIER_EXCEPTIONAL_ICON = 'military_tech';
const TIER_EXCEPTIONAL_CLASS = 'tier-exceptional';

const SCORE_TIERS: readonly ScoreTier[] = [
  {
    minScore: TIER_LOW_MIN,
    maxScore: TIER_LOW_MAX,
    label: TIER_LOW_LABEL,
    description: TIER_LOW_DESC,
    icon: TIER_LOW_ICON,
    badgeClass: TIER_LOW_CLASS,
  },
  {
    minScore: TIER_MODERATE_MIN,
    maxScore: TIER_MODERATE_MAX,
    label: TIER_MODERATE_LABEL,
    description: TIER_MODERATE_DESC,
    icon: TIER_MODERATE_ICON,
    badgeClass: TIER_MODERATE_CLASS,
  },
  {
    minScore: TIER_GOOD_MIN,
    maxScore: TIER_GOOD_MAX,
    label: TIER_GOOD_LABEL,
    description: TIER_GOOD_DESC,
    icon: TIER_GOOD_ICON,
    badgeClass: TIER_GOOD_CLASS,
  },
  {
    minScore: TIER_EXCEPTIONAL_MIN,
    maxScore: TIER_EXCEPTIONAL_MAX,
    label: TIER_EXCEPTIONAL_LABEL,
    description: TIER_EXCEPTIONAL_DESC,
    icon: TIER_EXCEPTIONAL_ICON,
    badgeClass: TIER_EXCEPTIONAL_CLASS,
  },
];

@Component({
  selector: 'app-score-input',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './score-input.component.html',
  styleUrl: './score-input.component.scss',
})
export class ScoreInputComponent implements OnChanges {
  @Input() readonly = false;
  @Input() selectedScore: number | null = null;
  @Output() scoreSubmitted = new EventEmitter<number>();

  readonly availableScores = AVAILABLE_SCORES;
  internalSelectedScore: number | null = null;

  get activeTier(): ScoreTier | null {
    const score = this.internalSelectedScore;
    if (score === null) {
      return null;
    }
    return (
      SCORE_TIERS.find(
        (tier) => score >= tier.minScore && score <= tier.maxScore
      ) ?? null
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedScore']) {
      this.internalSelectedScore = changes['selectedScore'].currentValue;
    }
  }

  selectScore(score: number): void {
    if (!this.readonly) {
      this.internalSelectedScore = score;
    }
  }

  submit(): void {
    if (this.internalSelectedScore !== null) {
      this.scoreSubmitted.emit(this.internalSelectedScore);
    }
  }
}
