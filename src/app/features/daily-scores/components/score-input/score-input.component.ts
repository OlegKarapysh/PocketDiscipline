import { Component, EventEmitter, Output, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-score-input',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="score-input-container">
      <h2>How was your discipline today?</h2>
      
      @if (!readonly) {
        <div class="score-buttons">
          @for (s of availableScores; track s) {
            <button mat-fab 
                    (click)="selectScore(s)"
                    [color]="internalSelectedScore === s ? 'accent' : 'primary'">
              {{ s }}
            </button>
          }
        </div>
      } @else {
        <div class="readonly-score">
          <div class="score-circle">
            {{ internalSelectedScore }}
          </div>
          <p>Score set for today!</p>
        </div>
      }

      @if (!readonly && internalSelectedScore !== null) {
        <div class="actions">
          <button mat-flat-button color="accent" (click)="submit()">Submit Score</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .score-input-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px;
      gap: 24px;
    }
    .score-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
      max-width: 600px;
    }
    .actions {
      margin-top: 16px;
    }
    .readonly-score {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .score-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background-color: #3f51b5;
      color: white;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 32px;
      font-weight: bold;
    }
  `]
})
export class ScoreInputComponent implements OnChanges {
  @Input() readonly = false;
  @Input() selectedScore: number | null = null;
  @Output() scoreSubmitted = new EventEmitter<number>();

  availableScores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
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
