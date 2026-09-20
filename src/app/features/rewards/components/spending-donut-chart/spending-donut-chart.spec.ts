import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { SpendingDonutChartComponent } from './spending-donut-chart';
import type { CategorySpendingBreakdown } from '../../models/category-spending-breakdown.model';

describe('SpendingDonutChartComponent', () => {
  let component: SpendingDonutChartComponent;
  let fixture: ComponentFixture<SpendingDonutChartComponent>;
  let mockBreakdown: CategorySpendingBreakdown[];

  beforeEach(async () => {
    mockBreakdown = [
      {
        categoryId: 'cat-food',
        categoryName: 'Food & Treats',
        color: '#ff9800',
        icon: 'fastfood',
        totalSpent: 300,
        percentage: 30,
      },
      {
        categoryId: 'cat-gear',
        categoryName: 'Gear & Tech',
        color: '#2196f3',
        icon: 'devices',
        totalSpent: 700,
        percentage: 70,
      },
    ];

    await TestBed.configureTestingModule({
      imports: [SpendingDonutChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SpendingDonutChartComponent);
    component = fixture.componentInstance;
  });

  it('should create with empty data and display zero total spent', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(component.slices().length).toBe(0);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.center-value')?.textContent).toContain('0 ₴');
  });

  it('should compute slices and render segments and legend when data is set', () => {
    fixture.componentRef.setInput('data', mockBreakdown);
    fixture.componentRef.setInput('totalSpent', 1000);
    fixture.detectChanges();

    expect(component.slices().length).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    const segments = compiled.querySelectorAll('.donut-segment');
    expect(segments.length).toBe(2);

    const legendItems = compiled.querySelectorAll('.legend-item');
    expect(legendItems.length).toBe(2);
    expect(legendItems[0].textContent).toContain('Food & Treats');
    expect(legendItems[0].textContent).toContain('30%');
    expect(legendItems[0].textContent).toContain('300 ₴');
    expect(legendItems[1].textContent).toContain('Gear & Tech');
    expect(legendItems[1].textContent).toContain('70%');
    expect(legendItems[1].textContent).toContain('700 ₴');
  });

  it('should update active category and center text when hovering a donut segment via DOM event', () => {
    fixture.componentRef.setInput('data', mockBreakdown);
    fixture.componentRef.setInput('totalSpent', 1000);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const firstSegment = compiled.querySelectorAll('.donut-segment')[0];

    firstSegment.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(component.hoveredCategoryId()).toBe('cat-food');
    expect(component.activeCategory()?.categoryName).toBe('Food & Treats');
    expect(firstSegment.classList.contains('hovered')).toBe(true);

    expect(compiled.querySelector('.center-label')?.textContent).toContain('Food & Treats');
    expect(compiled.querySelector('.center-value')?.textContent).toContain('300 ₴');
    expect(compiled.querySelector('.center-sub')?.textContent).toContain('30%');

    firstSegment.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();

    expect(component.hoveredCategoryId()).toBeNull();
    expect(firstSegment.classList.contains('hovered')).toBe(false);
    expect(compiled.querySelector('.center-label')?.textContent).toContain('Total Spent');
    expect(compiled.querySelector('.center-value')?.textContent).toContain('1000 ₴');
  });

  it('should update active category when hovering a legend item via DOM event', () => {
    fixture.componentRef.setInput('data', mockBreakdown);
    fixture.componentRef.setInput('totalSpent', 1000);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const secondLegendItem = compiled.querySelectorAll('.legend-item')[1];

    secondLegendItem.dispatchEvent(new MouseEvent('mouseenter'));
    fixture.detectChanges();

    expect(component.hoveredCategoryId()).toBe('cat-gear');
    expect(secondLegendItem.classList.contains('highlighted')).toBe(true);
    expect(compiled.querySelector('.center-label')?.textContent).toContain('Gear & Tech');
    expect(compiled.querySelector('.center-value')?.textContent).toContain('700 ₴');

    secondLegendItem.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();

    expect(component.hoveredCategoryId()).toBeNull();
    expect(secondLegendItem.classList.contains('highlighted')).toBe(false);
  });
});
