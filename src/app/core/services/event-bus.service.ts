import { Service } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { AppEvent } from '../models/app-event.model';
import { EVENT_TYPE, RewardEarnedEvent } from '../models/reward-earned-event.model';

export { EVENT_TYPE };
export type { AppEvent, RewardEarnedEvent };

@Service()
export class EventBusService {
  private eventSubject = new Subject<AppEvent>();

  emit(event: AppEvent): void {
    this.eventSubject.next(event);
  }

  on<T extends AppEvent>(eventType: T['type']): Observable<T> {
    return this.eventSubject.asObservable().pipe(
      filter((e): e is T => e.type === eventType)
    );
  }
}
