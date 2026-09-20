import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { By } from '@angular/platform-browser';
import { BehaviorSubject } from 'rxjs';
import { BalanceWidget } from './balance-widget';
import { UserService } from '../../../../core/services/user.service';
import type { User } from '../../../../core/models/user.model';
import { EventBusService } from '../../../../core/services/event-bus.service';

describe('BalanceWidget', () => {
  let fixture: ComponentFixture<BalanceWidget>;
  let userSubject: BehaviorSubject<User | undefined>;
  let eventBusMock: { emit: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    userSubject = new BehaviorSubject<User | undefined>({
      id: 1,
      name: 'Current',
      balance: 2500,
      createdAt: 1000,
      updatedAt: 1000,
    });

    eventBusMock = {
      emit: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [BalanceWidget],
      providers: [
        { provide: UserService, useValue: { user$: userSubject.asObservable() } },
        { provide: EventBusService, useValue: eventBusMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BalanceWidget);
  });

  it('should render user balance with currency symbol ₴', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const amountEl = fixture.debugElement.query(By.css('.amount'));
    expect((amountEl.nativeElement as HTMLElement).textContent.trim()).toBe('2,500 ₴');
  });

  it('should render placeholder "-- ₴" when user is undefined', async () => {
    userSubject.next(undefined);
    fixture.detectChanges();
    await fixture.whenStable();

    const amountEl = fixture.debugElement.query(By.css('.amount'));
    expect((amountEl.nativeElement as HTMLElement).textContent.trim()).toBe('-- ₴');
  });

  it('should emit REQUEST_QUICK_SPEND event when clicking the Quick Spend button in the DOM', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const button = fixture.debugElement.query(By.css('.quick-spend-btn'));
    expect(button).toBeTruthy();
    (button.nativeElement as HTMLElement).click();

    expect(eventBusMock.emit).toHaveBeenCalledWith({ type: 'REQUEST_QUICK_SPEND' });
  });

  it('should handle error gracefully and render placeholder "-- ₴" when user$ errors', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockReturnValue(undefined);
    userSubject.error(new Error('User error'));
    fixture.detectChanges();
    await fixture.whenStable();

    const amountEl = fixture.debugElement.query(By.css('.amount'));
    expect((amountEl.nativeElement as HTMLElement).textContent.trim()).toBe('-- ₴');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
