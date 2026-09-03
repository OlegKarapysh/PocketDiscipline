import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EventBusService, EVENT_TYPE, RewardEarnedEvent } from './event-bus.service';


describe('EventBusService', () => {
  let service: EventBusService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EventBusService],
    });
    service = TestBed.inject(EventBusService);
  });

  it('should emit and receive events filtered by event type', () => {
    let receivedEvent: RewardEarnedEvent | null = null;

    service.on<RewardEarnedEvent>(EVENT_TYPE.REWARD_EARNED).subscribe((e) => {
      receivedEvent = e;
    });

    const mockEvent: RewardEarnedEvent = {
      type: EVENT_TYPE.REWARD_EARNED,
      payload: { points: 50 },
      source: 'pomodoro',
    };

    service.emit(mockEvent);

    expect(receivedEvent).toEqual(mockEvent);
  });

  it('should filter out events of different types', () => {
    let received = false;

    service.on<RewardEarnedEvent>(EVENT_TYPE.REWARD_EARNED).subscribe(() => {
      received = true;
    });

    service.emit({
      type: 'OTHER_EVENT',
      payload: {},
    });

    expect(received).toBe(false);
  });
});
