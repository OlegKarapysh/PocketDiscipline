import { Component, computed, inject, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, from } from 'rxjs';
import { RewardsService } from '../../services/rewards.service';
import { CategoryService } from '../../services/category.service';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/user.model';
import { RewardItem } from '../../models/reward.model';
import { RewardCategory } from '../../models/reward-category.model';
import { RewardStatus } from '../../models/reward-status.type';
import { RewardCardComponent } from '../reward-card/reward-card';
import { RewardFormDialogComponent } from '../reward-form-dialog/reward-form-dialog';

@Component({
  selector: 'app-reward-store',
  imports: [
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    RewardCardComponent,
  ],
  templateUrl: './reward-store.html',
  styleUrl: './reward-store.scss',
})
export class RewardStoreComponent {
  private readonly rewardsService = inject(RewardsService);
  private readonly categoryService = inject(CategoryService);
  private readonly userService = inject(UserService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly user = toSignal(from(this.userService.user$) as Observable<User | undefined>, {
    initialValue: undefined,
  });

  readonly rewards = toSignal(this.rewardsService.getRewards(), { initialValue: [] as RewardItem[] });
  readonly categories = toSignal(this.categoryService.getCategories(), { initialValue: [] as RewardCategory[] });

  readonly statusFilter = signal<RewardStatus>('active');
  readonly selectedCategoryId = signal<string>('all');
  readonly searchQuery = signal<string>('');

  readonly categoriesMap = computed(() => {
    const map = new Map<string, RewardCategory>();
    for (const cat of this.categories()) {
      map.set(cat.id, cat);
    }
    return map;
  });

  readonly activeRewardsCount = computed(() => {
    return this.rewards().filter((r) => r.status === 'active').length;
  });

  readonly claimedRewardsCount = computed(() => {
    return this.rewards().filter((r) => r.status === 'claimed').length;
  });

  readonly filteredRewards = computed(() => {
    const status = this.statusFilter();
    const categoryId = this.selectedCategoryId();
    const query = this.searchQuery().toLowerCase().trim();

    return this.rewards().filter((reward) => {
      if (reward.status !== status) {
        return false;
      }
      if (categoryId !== 'all' && reward.categoryId !== categoryId) {
        return false;
      }
      if (query && !reward.title.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    });
  });

  getCategory(categoryId: string): RewardCategory | undefined {
    return this.categoriesMap().get(categoryId);
  }

  openAddReward(): void {
    this.dialog.open(RewardFormDialogComponent, {
      width: '460px',
    });
  }

  onEditReward(reward: RewardItem): void {
    this.dialog.open(RewardFormDialogComponent, {
      width: '460px',
      data: { reward },
    });
  }

  async onDeleteReward(reward: RewardItem): Promise<void> {
    try {
      await this.rewardsService.deleteReward(reward.id);
      this.snackBar.open(`Deleted "${reward.title}"`, 'Close', { duration: 3000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete reward';
      this.snackBar.open(message, 'Close', { duration: 3000 });
    }
  }

  async onClaimReward(reward: RewardItem): Promise<void> {
    try {
      const withdrawal = await this.rewardsService.claimReward(reward);
      this.snackBar.open(`Redeemed "${reward.title}" for ${withdrawal.amount} ₴!`, 'Close', { duration: 4000 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Claiming failed';
      this.snackBar.open(message, 'Close', { duration: 3000 });
    }
  }
}
