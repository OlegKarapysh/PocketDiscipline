import { Component, DestroyRef, computed, inject, signal } from '@angular/core';

import { form, FormField } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import type { Observable } from 'rxjs';
import { EMPTY, catchError, from, switchMap, tap } from 'rxjs';
import { RewardsService } from '../../services/rewards.service';
import { CategoryService } from '../../services/category.service';
import { UserService } from '../../../../core/services/user.service';
import type { User } from '../../../../core/models/user.model';
import type { RewardItem } from '../../../../core/models/reward.model';
import type { RewardCategory } from '../../../../core/models/reward-category.model';
import type { RewardStatus } from '../../../../core/models/reward-status.type';
import { RewardCard } from '../reward-card/reward-card';
import { RewardFormDialog } from '../reward-form-dialog/reward-form-dialog';
import { SegmentedControl } from '../../../../shared/components/segmented-control/segmented-control';
import type { SegmentOption } from '../../../../shared/components/segmented-control/segment-option.model';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { SnackBarService } from '../../../../shared/services/snack-bar.service';
import { ConfirmService } from '../../../../shared/services/confirm.service';
import { MONEY_FORMAT } from '../../../../shared/constants/money-format.const';

@Component({
  selector: 'app-reward-store',
  imports: [
    FormField,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    SegmentedControl,
    EmptyState,
    RewardCard,
  ],
  templateUrl: './reward-store.html',
  styleUrl: './reward-store.scss',
})
export class RewardStore {
  private readonly rewardsService = inject(RewardsService);
  private readonly categoryService = inject(CategoryService);
  private readonly userService = inject(UserService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(SnackBarService);
  private readonly confirmService = inject(ConfirmService);
  private readonly destroyRef = inject(DestroyRef);

  readonly user = toSignal(
    (from(this.userService.user$) as Observable<User | undefined>).pipe(
      catchError((error: unknown) => {
        this.snackBar.error(error, 'Failed to load balance');
        return EMPTY;
      }),
    ),
    { initialValue: undefined },
  );

  readonly rewards = toSignal(
    this.rewardsService.getRewards().pipe(
      catchError((error: unknown) => {
        this.snackBar.error(error, 'Failed to load rewards');
        return EMPTY;
      }),
    ),
    { initialValue: [] as RewardItem[] },
  );
  readonly categories = toSignal(
    this.categoryService.getCategories().pipe(
      catchError((error: unknown) => {
        this.snackBar.error(error, 'Failed to load categories');
        return EMPTY;
      }),
    ),
    { initialValue: [] as RewardCategory[] },
  );

  readonly claimingRewardId = signal<string | null>(null);
  readonly statusFilter = signal<RewardStatus>('active');
  readonly filters = signal({ query: '', categoryId: 'all' });
  readonly filterForm = form(this.filters);

  readonly balance = computed(() => this.user()?.balance ?? 0);

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

  readonly statusOptions = computed<SegmentOption<RewardStatus>[]>(() => [
    { value: 'active', label: `Active wishlist (${this.activeRewardsCount()})` },
    { value: 'claimed', label: `Claimed (${this.claimedRewardsCount()})` },
  ]);

  readonly filteredRewards = computed(() => {
    const status = this.statusFilter();
    const { categoryId, query } = this.filters();
    const needle = query.toLowerCase().trim();

    return this.rewards().filter((reward) => {
      if (reward.status !== status) {
        return false;
      }
      if (categoryId !== 'all' && reward.categoryId !== categoryId) {
        return false;
      }
      if (needle && !reward.title.toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });
  });

  readonly rewardRows = computed(() => {
    const categories = this.categoriesMap();
    const claimingId = this.claimingRewardId();
    return this.filteredRewards().map((reward) => ({
      reward,
      category: categories.get(reward.categoryId),
      isClaiming: reward.id === claimingId,
    }));
  });

  openAddReward(): void {
    this.dialog.open(RewardFormDialog, {
      width: '460px',
    });
  }

  onEditReward(reward: RewardItem): void {
    this.dialog.open(RewardFormDialog, {
      width: '460px',
      data: { reward },
    });
  }

  onDeleteReward(reward: RewardItem): void {
    this.confirmService
      .ask({
        title: 'Delete reward',
        message: `Are you sure you want to delete "${reward.title}"? Its redemption history is kept, and your balance does not change.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        isDestructive: true,
      })
      .pipe(
        switchMap(() =>
          from(this.rewardsService.deleteReward(reward.id)).pipe(
            tap(() => {
              this.snackBar.show(`Deleted "${reward.title}"`);
            }),
            catchError((error: unknown) => {
              this.snackBar.error(error, 'Failed to delete reward');
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  async onClaimReward(reward: RewardItem): Promise<void> {
    if (this.claimingRewardId() !== null) return;

    this.claimingRewardId.set(reward.id);
    try {
      const withdrawal = await this.rewardsService.claimReward(reward);
      this.snackBar.show(`Redeemed "${reward.title}" for ${MONEY_FORMAT.format(withdrawal.amount)} ₴`);
    } catch (error) {
      this.snackBar.error(error, 'Claiming failed');
    } finally {
      this.claimingRewardId.set(null);
    }
  }
}
