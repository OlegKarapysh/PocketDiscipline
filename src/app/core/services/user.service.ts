import { Injectable, inject } from '@angular/core';
import { DbService } from './db.service';
import { User } from '../models/data-models';
import { liveQuery } from 'dexie';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private db = inject(DbService);

  readonly user$ = liveQuery(async () => {
    let user = await this.db.users.get(1);
    if (!user) {
      user = { id: 1, name: 'User', balance: 0, createdAt: Date.now(), updatedAt: Date.now() };
      await this.db.users.add(user);
    }
    return user;
  });

  async addBalance(amount: number) {
    const user = await this.db.users.get(1);
    if (user) {
      await this.db.users.update(1, { 
        balance: user.balance + amount,
        updatedAt: Date.now()
      });
    }
  }
}
