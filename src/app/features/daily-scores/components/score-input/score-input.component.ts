import { Component, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

const AVAILABLE_SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

@Component({
  selector: 'app-score-input',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './score-input.component.html',
  styleUrl: './score-input.component.scss',
})
export class ScoreInputComponent implements OnChanges {
  @Input() readonly = false;
  @Input() selectedScore: number | null = null;
  @Output() scoreSubmitted = new EventEmitter<number>();

  readonly availableScores = AVAILABLE_SCORES;
  internalSelectedScore: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedScore']) {
      this.internalSelectedScore = changes['selectedScore'].currentValue;
    }
  }

  selectScore(score: number) {
    if (!this.readonly) {
      this.internalSelectedScore = score;
    }
  }

  submit() {
    if (this.internalSelectedScore !== null) {
      this.scoreSubmitted.emit(this.internalSelectedScore);
    }
  }
}
