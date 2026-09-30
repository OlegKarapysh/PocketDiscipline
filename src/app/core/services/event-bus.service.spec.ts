import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AppEvent } from './event-bus.service';
import { EventBusService } from './event-bus.service';

interface PingEvent extends AppEvent {
  type: 'PING';
  payload: { count: number };
}

describe('EventBusService', () => {
  let service: EventBusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EventBusService],
    });
    service = TestBed.inject(EventBusService);
  });

  it('should emit and receive events filtered by event type', () => {
    let receivedEvent: PingEvent | null = null;

    service.on<PingEvent>('PING').subscribe((e) => {
      receivedEvent = e;
    });

    const mockEvent: PingEvent = {
      type: 'PING',
      payload: { count: 50 },
      source: 'test',
    };

    service.emit(mockEvent);

    expect(receivedEvent).toEqual(mockEvent);
  });

  it('should filter out events of different types', () => {
    let received = false;

    service.on<PingEvent>('PING').subscribe(() => {
      received = true;
    });

    service.emit({
      type: 'OTHER_EVENT',
      payload: {},
    });

    expect(received).toBe(false);
  });
});
