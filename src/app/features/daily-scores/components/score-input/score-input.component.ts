import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { DailyScoreSystem } from '../../models/daily-score-system.model';
import { DailyScoreTier } from '../../models/daily-score-tier.model';

@Component({
  selector: 'app-score-input',
  imports: [MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './score-input.component.html',
  styleUrl: './score-input.component.scss',
})
export class ScoreInputComponent {
  readonly readonly = input<boolean>(false);
  readonly selectedScore = input<number | null>(null);
  readonly scoreSubmitted = output<number>();

  readonly availableScores = DailyScoreSystem.OPTIONS.map(o => o.value);
  readonly internalSelectedScore = linkedSignal<number | null>(() => this.selectedScore());

  readonly activeTier = computed<DailyScoreTier | null>(() => {
    const score = this.internalSelectedScore();
    if (score === null) {
      return null;
    }
    return DailyScoreSystem.getOption(score)?.tier ?? null;
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
