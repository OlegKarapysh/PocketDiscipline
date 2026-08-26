import { Component, inject } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { PomodoroTimerService } from '../../services/pomodoro-timer.service';
import { EngagementType } from '../../models/pomodoro-session.model';

@Component({
  selector: 'app-session-config',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    @if (!isActive()) {
      <div class="config-container">
        <mat-form-field appearance="outline">
          <mat-label>Duration (minutes)</mat-label>
          <input
            matInput
            type="number"
            min="15"
            max="120"
            step="5"
            [ngModel]="duration()"
            (ngModelChange)="updateDuration($event)"
            [disabled]="isActive()"
          />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Engagement Type</mat-label>
          <mat-select [ngModel]="engagementType()" (ngModelChange)="updateEngagement($event)" [disabled]="isActive()">
            <mat-option value="work">Work</mat-option>
            <mat-option value="study">Study</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
    }
  `,
  styles: [
    `
      .config-container {
        display: flex;
        gap: 1rem;
        justify-content: center;
        margin-top: 2rem;
      }
    `,
  ],
})
export class SessionConfig {
  private timerService = inject(PomodoroTimerService);

  isActive = this.timerService.isActive;
  duration = this.timerService.durationMinutes;
  engagementType = this.timerService.engagementType;

  updateDuration(val: number) {
    if (val >= 15 && val <= 120) {
      this.timerService.setConfig({
        durationMinutes: val,
        engagementType: this.engagementType(),
      });
    }
  }

  updateEngagement(val: EngagementType) {
    this.timerService.setConfig({
      durationMinutes: this.duration(),
      engagementType: val,
    });
  }
}
