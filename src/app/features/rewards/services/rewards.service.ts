import { Service, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import type { Observable } from 'rxjs';
import { from } from 'rxjs';
import { DbService } from '../../../core/services/db.service';
import { CURRENT_USER_ID } from '../../../core/models/user.model';
import type { RewardItem } from '../models/reward.model';
import type { RewardStatus } from '../models/reward-status.type';
import type { CreateRewardDto } from '../models/create-reward.dto';
import type { UpdateRewardDto } from '../models/update-reward.dto';
import type { WithdrawalRecord } from '../models/withdrawal.model';

const ERROR_INVALID_COST = 'Reward cost must be greater than zero';
const ERROR_EMPTY_TITLE = 'Reward title cannot be empty';
const ERROR_REWARD_NOT_FOUND = 'Reward not found';
const ERROR_INSUFFICIENT_BALANCE = 'Insufficient balance to claim reward';
const TRANSACTION_READ_WRITE = 'rw';

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
          rewards = rewards.filter(r => r.status === status);
        }
        return rewards;
      })
    );
  }

  async getRewardById(id: string): Promise<RewardItem | undefined> {
    return this.db.rewards.get(id);
  }

  async createReward(dto: CreateRewardDto): Promise<RewardItem> {
    if (dto.cost <= 0 || !Number.isFinite(dto.cost)) {
      throw new Error(ERROR_INVALID_COST);
    }

    const trimmedTitle = dto.title.trim();
    if (!trimmedTitle) {
      throw new Error(ERROR_EMPTY_TITLE);
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
    const existing = await this.db.rewards.get(id);
    if (!existing) {
      throw new Error(ERROR_REWARD_NOT_FOUND);
    }

    const updates: Partial<RewardItem> = {
      updatedAt: Date.now(),
    };

    if (dto.title !== undefined) {
      const trimmed = dto.title.trim();
      if (!trimmed) {
        throw new Error(ERROR_EMPTY_TITLE);
      }
      updates.title = trimmed;
    }

    if (dto.cost !== undefined) {
      if (dto.cost <= 0 || !Number.isFinite(dto.cost)) {
        throw new Error(ERROR_INVALID_COST);
      }
      updates.cost = dto.cost;
    }

    if (dto.categoryId !== undefined) {
      updates.categoryId = dto.categoryId;
    }

    if (dto.type !== undefined) {
      updates.type = dto.type;
    }

    await this.db.rewards.update(id, updates);
    return { ...existing, ...updates };
  }

  async deleteReward(id: string): Promise<void> {
    const existing = await this.db.rewards.get(id);
    if (!existing) {
      throw new Error(ERROR_REWARD_NOT_FOUND);
    }
    await this.db.rewards.delete(id);
  }

  async claimReward(reward: RewardItem): Promise<WithdrawalRecord> {
    return await this.db.transaction(
      TRANSACTION_READ_WRITE,
      this.db.users,
      this.db.withdrawals,
      this.db.rewards,
      async () => {
        const currentReward = await this.db.rewards.get(reward.id);
        if (!currentReward) throw new Error(ERROR_REWARD_NOT_FOUND);
        if (currentReward.type === 'one-time' && currentReward.status === 'claimed') {
          throw new Error('Reward already claimed');
        }

        const user = await this.db.users.get(CURRENT_USER_ID);
        if (!user || user.balance < currentReward.cost) {
          throw new Error(ERROR_INSUFFICIENT_BALANCE);
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
      }
    );
  }
}
