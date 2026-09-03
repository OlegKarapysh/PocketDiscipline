import { Service, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { concatMap, filter } from 'rxjs/operators';
import { DbService } from './db.service';
import { liveQuery } from 'dexie';
import { EventBusService, EVENT_TYPE, RewardEarnedEvent } from './event-bus.service';
import { CURRENT_USER_ID, CURRENT_USER_NAME, DEFAULT_INITIAL_BALANCE } from '../models/user.model';

@Service()
export class UserService {
  private db = inject(DbService);
  private eventBus = inject(EventBusService);

  constructor() {
    this.eventBus.on<RewardEarnedEvent>(EVENT_TYPE.REWARD_EARNED)
      .pipe(
        filter(event => !!event.payload?.points),
        concatMap(event => this.addBalance(event.payload.points)),
        takeUntilDestroyed()
      )
      .subscribe({
        error: (error) => console.error('Failed to update balance from event', error)
      });
  }

  readonly user$ = liveQuery(async () => {
    let user = await this.db.users.get(CURRENT_USER_ID);
    if (!user) {
      user = {
        id: CURRENT_USER_ID,
        name: CURRENT_USER_NAME,
        balance: DEFAULT_INITIAL_BALANCE,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }
    return user;
  });

  async addBalance(amount: number) {
    const user = await this.db.users.get(CURRENT_USER_ID);
    if (user) {
      await this.db.users.update(CURRENT_USER_ID, {
        balance: user.balance + amount,
        updatedAt: Date.now()
      });
    } else {
      await this.db.users.add({
        id: CURRENT_USER_ID,
        name: CURRENT_USER_NAME,
        balance: amount,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  }
}
