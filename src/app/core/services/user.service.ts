import { Service, inject } from '@angular/core';
import { DbService } from '../../database/db.service';
import { liveQuery } from 'dexie';
import { CURRENT_USER_ID, CURRENT_USER_NAME, DEFAULT_INITIAL_BALANCE } from '../models/user.model';

@Service()
export class UserService {
  private db = inject(DbService);

  readonly user$ = liveQuery(async () => {
    let user = await this.db.users.get(CURRENT_USER_ID);
    user ??= {
      id: CURRENT_USER_ID,
      name: CURRENT_USER_NAME,
      balance: DEFAULT_INITIAL_BALANCE,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return user;
  });

  // Callers that also write their own source row (a completed goal, a completion record) must open a
  // transaction over that table and `users`; this one then joins it, so both commit or neither does.
  async addBalance(amount: number) {
    if (!Number.isFinite(amount)) {
      console.error('Refusing to credit non-finite amount to balance:', amount);
      return;
    }

    await this.db.transaction('rw', this.db.users, async () => {
      const user = await this.db.users.get(CURRENT_USER_ID);
      if (user) {
        await this.db.users.update(CURRENT_USER_ID, {
          balance: user.balance + amount,
          updatedAt: Date.now(),
        });
      } else {
        await this.db.users.add({
          id: CURRENT_USER_ID,
          name: CURRENT_USER_NAME,
          balance: amount,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    });
  }

  /**
   * Replaces the balance with `amount`, a whole number of hryvnias from 0. Allowed once: a purge
   * reseeds the user row without `balanceSetUpAt`, which makes it available again.
   */
  async setUpBalance(amount: number): Promise<void> {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error('The balance must be a whole number of hryvnias, 0 or more.');
    }

    await this.db.transaction('rw', this.db.users, async () => {
      const user = await this.db.users.get(CURRENT_USER_ID);
      if (user?.balanceSetUpAt !== undefined) {
        throw new Error('The balance has already been set up.');
      }

      const now = Date.now();
      if (user) {
        await this.db.users.update(CURRENT_USER_ID, { balance: amount, balanceSetUpAt: now, updatedAt: now });
      } else {
        await this.db.users.add({
          id: CURRENT_USER_ID,
          name: CURRENT_USER_NAME,
          balance: amount,
          balanceSetUpAt: now,
          createdAt: now,
          updatedAt: now,
        });
      }
    });
  }
}
