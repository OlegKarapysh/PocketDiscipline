import { Component, computed, input, output } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RewardItem } from '../../models/reward.model';
import { RewardCategory } from '../../models/reward-category.model';

@Component({
  selector: 'app-reward-card',
  imports: [
    DecimalPipe,
    DatePipe,
    MatCardModule,
    MatProgressBarModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
  ],
  templateUrl: './reward-card.html',
  styleUrl: './reward-card.scss',
})
export class RewardCardComponent {
  readonly reward = input.required<RewardItem>();
  readonly currentBalance = input<number>(0);
  readonly category = input<RewardCategory | undefined>(undefined);

  readonly claim = output<RewardItem>();
  readonly edit = output<RewardItem>();
  readonly delete = output<RewardItem>();

  readonly progressPercentage = computed(() => {
    const cost = this.reward().cost;
    if (cost <= 0) return 100;
    const ratio = (this.currentBalance() / cost) * 100;
    return Math.min(100, Math.max(0, Math.round(ratio)));
  });

  readonly isAffordable = computed(() => {
    return this.currentBalance() >= this.reward().cost;
  });

  readonly remainingNeeded = computed(() => {
    return Math.max(0, this.reward().cost - this.currentBalance());
  });

  onClaim(): void {
    if (this.isAffordable() && this.reward().status === 'active') {
      this.claim.emit(this.reward());
    }
  }

  onEdit(): void {
    this.edit.emit(this.reward());
  }

  onDelete(): void {
    this.delete.emit(this.reward());
  }
}
