import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClockService } from './clock.service';

describe('ClockService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  function createAt(localTime: Date): ClockService {
    vi.setSystemTime(localTime);
    TestBed.configureTestingModule({});
    return TestBed.inject(ClockService);
  }

  it('should expose the local calendar day', () => {
    const service = createAt(new Date(2026, 8, 30, 12, 0));

    expect(service.today()).toBe('2026-09-30');
  });

  it('should move to the next day at local midnight', () => {
    const service = createAt(new Date(2026, 8, 30, 23, 59, 30));

    vi.advanceTimersByTime(31_000);

    expect(service.today()).toBe('2026-10-01');
  });

  it('should keep moving on every following midnight', () => {
    const service = createAt(new Date(2026, 8, 30, 23, 59, 30));

    vi.advanceTimersByTime(31_000 + 24 * 60 * 60 * 1000);

    expect(service.today()).toBe('2026-10-02');
  });

  it('should catch up when the page becomes visible after timers were frozen past midnight', () => {
    const service = createAt(new Date(2026, 8, 30, 22, 0));

    vi.setSystemTime(new Date(2026, 9, 1, 7, 0));
    document.dispatchEvent(new Event('visibilitychange'));

    expect(service.today()).toBe('2026-10-01');
  });
});
