import { Service } from '@angular/core';
import type { Observable } from 'rxjs';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';

import type { AppEvent } from '../models/app-event.model';

export type { AppEvent };

@Service()
export class EventBusService {
  private eventSubject = new Subject<AppEvent>();

  emit(event: AppEvent): void {
    this.eventSubject.next(event);
  }

  on<T extends AppEvent>(eventType: T['type']): Observable<T> {
    return this.eventSubject.asObservable().pipe(filter((e): e is T => e.type === eventType));
  }
}
