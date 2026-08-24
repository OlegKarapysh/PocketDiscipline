import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BalanceWidget } from './balance-widget';

describe('BalanceWidget', () => {
  let component: BalanceWidget;
  let fixture: ComponentFixture<BalanceWidget>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BalanceWidget],
    }).compileComponents();

    fixture = TestBed.createComponent(BalanceWidget);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
