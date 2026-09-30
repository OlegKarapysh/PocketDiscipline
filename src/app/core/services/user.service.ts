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
}
