import { Service, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { DbService } from '../../../database/db.service';
import { CURRENT_USER_ID } from '../../../core/models/user.model';
import type { RewardItem } from '../../../core/models/reward.model';
import type { RewardStatus } from '../../../core/models/reward-status.type';
import type { CreateRewardDto } from '../models/create-reward.dto';
import type { UpdateRewardDto } from '../models/update-reward.dto';
import type { WithdrawalRecord } from '../../../core/models/withdrawal.model';

export const ERROR_TYPE_LOCKED = 'The type of a reward cannot change once it has been claimed';

function getTodayDateString(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Service()
export class RewardsService {
  private readonly db = inject(DbService);

  getRewards(status?: RewardStatus): Observable<RewardItem[]> {
    return from(
      liveQuery(async () => {
        let rewards = await this.db.rewards.orderBy('createdAt').reverse().toArray();
        if (status) {
          rewards = rewards.filter((r) => r.status === status);
        }
        return rewards;
      }),
    );
  }

  async getRewardById(id: string): Promise<RewardItem | undefined> {
    return this.db.rewards.get(id);
  }

  async createReward(dto: CreateRewardDto): Promise<RewardItem> {
    if (dto.cost <= 0 || !Number.isFinite(dto.cost)) {
      throw new Error('Reward cost must be greater than zero');
    }

    const trimmedTitle = dto.title.trim();
    if (!trimmedTitle) {
      throw new Error('Reward title cannot be empty');
    }

    const newReward: RewardItem = {
      id: crypto.randomUUID(),
      title: trimmedTitle,
      cost: dto.cost,
      categoryId: dto.categoryId,
      type: dto.type,
      status: 'active',
      claimCount: 0,
      claimedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.db.rewards.add(newReward);
    return newReward;
  }

  async updateReward(id: string, dto: UpdateRewardDto): Promise<RewardItem> {
    return this.db.transaction('rw', this.db.rewards, async () => {
      const existing = await this.db.rewards.get(id);
      if (!existing) {
        throw new Error('Reward not found');
      }

      const updates: Partial<RewardItem> = {
        updatedAt: Date.now(),
      };

      if (dto.title !== undefined) {
        const trimmed = dto.title.trim();
        if (!trimmed) {
          throw new Error('Reward title cannot be empty');
        }
        updates.title = trimmed;
      }

      if (dto.cost !== undefined) {
        if (dto.cost <= 0 || !Number.isFinite(dto.cost)) {
          throw new Error('Reward cost must be greater than zero');
        }
        updates.cost = dto.cost;
      }

      if (dto.categoryId !== undefined) {
        updates.categoryId = dto.categoryId;
      }

      if (dto.type !== undefined) {
        if (dto.type !== existing.type && this.isTypeLocked(existing)) {
          throw new Error(ERROR_TYPE_LOCKED);
        }
        updates.type = dto.type;
      }

      await this.db.rewards.update(id, updates);
      return { ...existing, ...updates };
    });
  }

  // Claims are recorded differently per type (a one-time reward flips its status, a repeatable one
  // counts), and reverting a claim branches on the type, so a claimed reward must keep its type.
  isTypeLocked(reward: RewardItem): boolean {
    return reward.status === 'claimed' || reward.claimCount > 0;
  }

  async deleteReward(id: string): Promise<void> {
    const existing = await this.db.rewards.get(id);
    if (!existing) {
      throw new Error('Reward not found');
    }
    await this.db.rewards.delete(id);
  }

  async claimReward(reward: RewardItem): Promise<WithdrawalRecord> {
    return await this.db.transaction('rw', this.db.users, this.db.withdrawals, this.db.rewards, async () => {
      const currentReward = await this.db.rewards.get(reward.id);
      if (!currentReward) throw new Error('Reward not found');
      if (currentReward.type === 'one-time' && currentReward.status === 'claimed') {
        throw new Error('Reward already claimed');
      }

      const user = await this.db.users.get(CURRENT_USER_ID);
      if (!user || user.balance < currentReward.cost) {
        throw new Error('Insufficient balance to claim reward');
      }

      await this.db.users.update(CURRENT_USER_ID, {
        balance: user.balance - currentReward.cost,
        updatedAt: Date.now(),
      });

      const createdRecord: WithdrawalRecord = {
        id: crypto.randomUUID(),
        amount: currentReward.cost,
        title: `Claimed: ${currentReward.title}`,
        categoryId: currentReward.categoryId,
        notes: `Redeemed ${currentReward.type === 'one-time' ? 'milestone' : 'reward'} from store`,
        date: getTodayDateString(),
        timestamp: Date.now(),
        rewardId: currentReward.id,
      };

      await this.db.withdrawals.add(createdRecord);

      if (currentReward.type === 'one-time') {
        await this.db.rewards.update(currentReward.id, {
          status: 'claimed',
          claimedAt: Date.now(),
          updatedAt: Date.now(),
        });
      } else {
        await this.db.rewards.update(currentReward.id, {
          claimCount: (currentReward.claimCount || 0) + 1,
          updatedAt: Date.now(),
        });
      }
      return createdRecord;
    });
  }
}
