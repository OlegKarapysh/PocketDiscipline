import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { SpendingTrendChartComponent } from './spending-trend-chart';
import type { SpendingTrendPoint } from '../../models/spending-trend-point.model';

describe('SpendingTrendChartComponent', () => {
  let component: SpendingTrendChartComponent;
  let fixture: ComponentFixture<SpendingTrendChartComponent>;
  let mockPoints: SpendingTrendPoint[];

  beforeEach(async () => {
    mockPoints = [
      { dateOrMonth: '2026-09-01', label: '1 Sep', amount: 50 },
      { dateOrMonth: '2026-09-02', label: '2 Sep', amount: 0 },
      { dateOrMonth: '2026-09-03', label: '3 Sep', amount: 200 },
    ];

    await TestBed.configureTestingModule({
      imports: [SpendingTrendChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SpendingTrendChartComponent);
    component = fixture.componentInstance;
  });

  it('should create with empty data and display default gridlines', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.bars().length).toBe(0);
    expect(component.gridLines().length).toBe(3);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.hover-placeholder')).toBeTruthy();
  });

  it('should render bars when data is provided and apply has-amount styling correctly', () => {
    fixture.componentRef.setInput('data', mockPoints);
    fixture.detectChanges();

    expect(component.bars().length).toBe(3);
    const compiled = fixture.nativeElement as HTMLElement;
    const bars = compiled.querySelectorAll('.trend-bar');
    expect(bars.length).toBe(3);
    expect(bars[0].classList.contains('has-amount')).toBe(true);
    expect(bars[1].classList.contains('has-amount')).toBe(false);
    expect(bars[2].classList.contains('has-amount')).toBe(true);
  });

  it('should update hover info when hovering and unhovering a bar via DOM event', () => {
    fixture.componentRef.setInput('data', mockPoints);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const bars = compiled.querySelectorAll('.trend-bar');

    bars[2].dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(component.hoveredPoint()).toEqual(mockPoints[2]);
    expect(bars[2].classList.contains('hovered')).toBe(true);
    expect(compiled.querySelector('.hover-label')?.textContent).toContain('3 Sep:');
    expect(compiled.querySelector('.hover-amount')?.textContent).toContain('200 ₴');

    bars[2].dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();

    expect(component.hoveredPoint()).toBeNull();
    expect(bars[2].classList.contains('hovered')).toBe(false);
    expect(compiled.querySelector('.hover-placeholder')).toBeTruthy();
  });
});
