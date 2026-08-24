import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BalanceWidgetComponent } from './balance-widget';

describe('BalanceWidget', () => {
  let component: BalanceWidgetComponent;
  let fixture: ComponentFixture<BalanceWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BalanceWidgetComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BalanceWidgetComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
