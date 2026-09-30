import { DOCUMENT } from '@angular/common';
import { DestroyRef, Service, inject, signal } from '@angular/core';
import { DATE_LOCALE_CA } from '../constants/date-locale.const';

/**
 * The local calendar day as a signal, so anything derived from "today" re-derives when the day
 * changes. A PWA can stay open across midnight and a phone can freeze it in the background for
 * hours, so the day is re-read at local midnight and whenever the page becomes visible again.
 */
@Service()
export class ClockService {
  private readonly document = inject(DOCUMENT);
  private readonly todayState = signal(this.readToday());
  private midnightTimer: ReturnType<typeof setTimeout> | undefined;

  /** Today's local date as `YYYY-MM-DD`. */
  readonly today = this.todayState.asReadonly();

  constructor() {
    this.document.addEventListener('visibilitychange', this.refresh);
    this.scheduleMidnightRefresh();

    inject(DestroyRef).onDestroy(() => {
      this.document.removeEventListener('visibilitychange', this.refresh);
      clearTimeout(this.midnightTimer);
    });
  }

  private readonly refresh = (): void => {
    this.todayState.set(this.readToday());
    this.scheduleMidnightRefresh();
  };

  private scheduleMidnightRefresh(): void {
    clearTimeout(this.midnightTimer);
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    this.midnightTimer = setTimeout(this.refresh, nextMidnight.getTime() - now.getTime());
  }

  private readToday(): string {
    return new Date().toLocaleDateString(DATE_LOCALE_CA);
  }
}
