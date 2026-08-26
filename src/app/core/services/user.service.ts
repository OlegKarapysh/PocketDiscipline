import { Injectable, inject } from '@angular/core';
import { DbService } from './db.service';
import { User } from '../models/data-models';
import { liveQuery } from 'dexie';
import { EventBusService, RewardEarnedEvent } from './event-bus.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private db = inject(DbService);
  private eventBus = inject(EventBusService);

  constructor() {
    this.eventBus.on<RewardEarnedEvent>('RewardEarned').subscribe(event => {
      if (event.payload?.points) {
        this.addBalance(event.payload.points);
      }
    });
  }

  readonly user$ = liveQuery(async () => {
    let user = await this.db.users.get(1);
    if (!user) {
      user = { id: 1, name: 'User', balance: 0, createdAt: Date.now(), updatedAt: Date.now() };
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
    } else {
      await this.db.users.add({ 
        id: 1, 
        name: 'User', 
        balance: amount, 
        createdAt: Date.now(), 
        updatedAt: Date.now() 
      });
    }
  }
}
