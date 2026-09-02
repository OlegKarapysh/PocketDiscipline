import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { BalanceWidgetComponent } from './balance-widget';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/user.model';

const TEST_BALANCE = 2500;

describe('BalanceWidgetComponent', () => {
  let component: BalanceWidgetComponent;
  let fixture: ComponentFixture<BalanceWidgetComponent>;
  let userServiceMock: {
    user$: Observable<User | undefined>;
  };

  const mockUser: User = {
    id: 1,
    name: 'Current',
    balance: TEST_BALANCE,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(async () => {
    userServiceMock = {
      user$: of(mockUser),
    };

    await TestBed.configureTestingModule({
      imports: [BalanceWidgetComponent],
      providers: [
        { provide: UserService, useValue: userServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BalanceWidgetComponent);
    component = fixture.componentInstance;
  });

  it('should render user balance with currency symbol ₴', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const amountEl = fixture.debugElement.query(By.css('.amount'));
    expect(amountEl.nativeElement.textContent.trim()).toBe('2,500 ₴');
  });

  it('should render placeholder "-- ₴" when user is undefined', async () => {
    component.user$ = of(undefined);
    fixture.detectChanges();
    await fixture.whenStable();

    const amountEl = fixture.debugElement.query(By.css('.amount'));
    expect(amountEl.nativeElement.textContent.trim()).toBe('-- ₴');
  });
});
