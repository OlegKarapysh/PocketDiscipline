import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface AppEvent {
  type: string;
  payload?: unknown;
  source?: string;
}

export interface RewardEarnedEvent extends AppEvent {
  type: 'RewardEarned';
  payload: {
    points: number;
  };
}

@Injectable({
  providedIn: 'root'
})
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
