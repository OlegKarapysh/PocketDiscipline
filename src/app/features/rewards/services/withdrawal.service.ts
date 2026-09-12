import { Service, inject } from '@angular/core';
import { liveQuery } from 'dexie';
import { from, Observable } from 'rxjs';
import { DbService } from '../../../core/services/db.service';
import { CURRENT_USER_ID } from '../../../core/models/user.model';
import { WithdrawalRecord } from '../models/withdrawal.model';
import { CreateWithdrawalDto } from '../models/create-withdrawal.dto';
import { WithdrawalFilter } from '../models/withdrawal-filter.model';

const ERROR_INVALID_AMOUNT = 'Amount must be greater than zero';
const ERROR_EMPTY_TITLE = 'Title cannot be empty';
const ERROR_INSUFFICIENT_BALANCE = 'Insufficient balance';
const ERROR_RECORD_NOT_FOUND = 'Withdrawal record not found';
const TRANSACTION_READ_WRITE = 'rw';

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

@Service()
export class WithdrawalService {
  private readonly db = inject(DbService);

  async withdraw(dto: CreateWithdrawalDto): Promise<WithdrawalRecord> {
    if (dto.amount <= 0 || !Number.isFinite(dto.amount)) {
      throw new Error(ERROR_INVALID_AMOUNT);
    }

    const trimmedTitle = dto.title.trim();
    if (!trimmedTitle) {
      throw new Error(ERROR_EMPTY_TITLE);
    }
    
    if (dto.notes && dto.notes.length > 1000) {
      throw new Error('Notes must not exceed 1000 characters');
    }

    let createdRecord: WithdrawalRecord;

    await this.db.transaction(
      TRANSACTION_READ_WRITE,
      this.db.users,
      this.db.withdrawals,
      async () => {
        const user = await this.db.users.get(CURRENT_USER_ID);
        if (!user || user.balance < dto.amount) {
          throw new Error(ERROR_INSUFFICIENT_BALANCE);
        }

        await this.db.users.update(CURRENT_USER_ID, {
          balance: user.balance - dto.amount,
          updatedAt: Date.now(),
        });

        createdRecord = {
          id: crypto.randomUUID(),
          amount: dto.amount,
          title: trimmedTitle,
          categoryId: dto.categoryId,
          notes: dto.notes?.trim() ? dto.notes.trim() : undefined,
          date: getTodayDateString(),
          timestamp: Date.now(),
          rewardId: dto.rewardId ?? null,
        };

        await this.db.withdrawals.add(createdRecord);
      }
    );

    return createdRecord!;
  }

  async revertWithdrawal(id: string): Promise<void> {
    await this.db.transaction(
      TRANSACTION_READ_WRITE,
      this.db.users,
      this.db.withdrawals,
      this.db.rewards,
      async () => {
        const withdrawal = await this.db.withdrawals.get(id);
        if (!withdrawal) {
          throw new Error(ERROR_RECORD_NOT_FOUND);
        }

        const user = await this.db.users.get(CURRENT_USER_ID);
        if (user) {
          await this.db.users.update(CURRENT_USER_ID, {
            balance: user.balance + withdrawal.amount,
            updatedAt: Date.now(),
          });
        }

        if (withdrawal.rewardId) {
          const reward = await this.db.rewards.get(withdrawal.rewardId);
          if (reward) {
            if (reward.type === 'one-time') {
              await this.db.rewards.update(reward.id, {
                status: 'active',
                claimedAt: null,
                updatedAt: Date.now(),
              });
            } else if (reward.type === 'repeatable') {
              await this.db.rewards.update(reward.id, {
                claimCount: Math.max(0, (reward.claimCount || 1) - 1),
                updatedAt: Date.now(),
              });
            }
          }
        }

        await this.db.withdrawals.delete(id);
      }
    );
  }

  getWithdrawals(filter?: WithdrawalFilter): Observable<WithdrawalRecord[]> {
    return from(
      liveQuery(async () => {
        let records = await this.db.withdrawals.orderBy('timestamp').reverse().toArray();

        if (filter?.categoryId) {
          records = records.filter(r => r.categoryId === filter.categoryId);
        }
        if (filter?.startDate) {
          records = records.filter(r => r.date >= filter.startDate!);
        }
        if (filter?.endDate) {
          records = records.filter(r => r.date <= filter.endDate!);
        }
        if (filter?.searchQuery) {
          const query = filter.searchQuery.toLowerCase().trim();
          records = records.filter(
            r =>
              r.title.toLowerCase().includes(query) ||
              (r.notes?.toLowerCase().includes(query))
          );
        }

        return records;
      })
    );
  }

  async getWithdrawalById(id: string): Promise<WithdrawalRecord | undefined> {
    return this.db.withdrawals.get(id);
  }
}
