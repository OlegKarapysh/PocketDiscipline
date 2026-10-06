import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { SpendingTrendChart } from './spending-trend-chart';
import type { SpendingTrendPoint } from '../../models/spending-trend-point.model';

describe('SpendingTrendChart', () => {
  let component: SpendingTrendChart;
  let fixture: ComponentFixture<SpendingTrendChart>;
  let mockPoints: SpendingTrendPoint[];

  beforeEach(async () => {
    mockPoints = [
      { dateOrMonth: '2026-09-01', label: '1 Sep', amount: 50 },
      { dateOrMonth: '2026-09-02', label: '2 Sep', amount: 0 },
      { dateOrMonth: '2026-09-03', label: '3 Sep', amount: 200 },
    ];

    await TestBed.configureTestingModule({
      imports: [SpendingTrendChart],
    }).compileComponents();

    fixture = TestBed.createComponent(SpendingTrendChart);
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

  it('should keep neighbouring day labels from overlapping on a phone-width chart', () => {
    const month: SpendingTrendPoint[] = Array.from({ length: 30 }, (_, i) => ({
      dateOrMonth: `2026-09-${String(i + 1).padStart(2, '0')}`,
      label: `${i + 1} Sep`,
      amount: 100,
    }));
    component.width.set(280);
    fixture.componentRef.setInput('data', month);
    fixture.detectChanges();

    const centres = component
      .bars()
      .filter((bar) => bar.showLabel)
      .map((bar) => bar.x + bar.width / 2);
    const gaps = centres.slice(1).map((centre, i) => centre - centres[i]);
    // "30 Sep" is six 11px Geist Mono glyphs, about 38px wide.
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(39);
  });

  it('should label the y-axis in whole hryvnias', () => {
    // 13 ₴ with 15% headroom is 14.95 ₴: the axis tops out at 15 ₴ and halves to 8 ₴, not 7,5 ₴.
    fixture.componentRef.setInput('data', [{ dateOrMonth: '2026-09-01', label: '1 Sep', amount: 13 }]);
    fixture.detectChanges();

    expect(component.gridLines().map((line) => line.label)).toEqual(['15 ₴', '8 ₴', '0 ₴']);
  });

  it('should leave room for the widest y-axis amount before the first bar', () => {
    fixture.componentRef.setInput('data', [{ dateOrMonth: '2026-09-01', label: '1 Sep', amount: 141_976 }]);
    fixture.detectChanges();

    // The top label is "163 273 ₴": nine 11px Geist Mono glyphs, about 57.4px wide, drawn
    // right-aligned at yAxisTextX, so it needs that much room to its left.
    expect(component.gridLines()[0].label.replace(/\s/g, ' ')).toBe('163 273 ₴');
    expect(component.yAxisTextX()).toBeGreaterThanOrEqual(58);
    expect(component.bars()[0].x).toBeGreaterThan(component.yAxisTextX());
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
    expect(compiled.querySelector('.hover-amount')?.textContent).toMatch(/200\s*₴/);

    bars[2].dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();

    expect(component.hoveredPoint()).toBeNull();
    expect(bars[2].classList.contains('hovered')).toBe(false);
    expect(compiled.querySelector('.hover-placeholder')).toBeTruthy();
  });
});
