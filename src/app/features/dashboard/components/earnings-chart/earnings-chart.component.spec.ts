import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { EarningsChartComponent } from './earnings-chart.component';
import { DailyEarningsRecord } from '../../models/daily-earnings-record.model';

describe('EarningsChartComponent', () => {
  let component: EarningsChartComponent;
  let fixture: ComponentFixture<EarningsChartComponent>;

  const mockRecords: DailyEarningsRecord[] = [
    {
      date: '2026-08-27',
      totalEarned: 1000,
      goalsEarned: 500,
      dailyTasksEarned: 200,
      pomodoroEarned: 300,
      dailyScoresEarned: 0,
    },
    {
      date: '2026-08-28',
      totalEarned: 0,
      goalsEarned: 0,
      dailyTasksEarned: 0,
      pomodoroEarned: 0,
      dailyScoresEarned: 0,
    },
    {
      date: '2026-08-29',
      totalEarned: 1500,
      goalsEarned: 1500,
      dailyTasksEarned: 0,
      pomodoroEarned: 0,
      dailyScoresEarned: 0,
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EarningsChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EarningsChartComponent);
    component = fixture.componentInstance;
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should compute bars corresponding to records input', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    const bars = component.bars();
    expect(bars.length).toBe(3);
    expect(bars[0].total).toBe(1000);
    expect(bars[1].total).toBe(0);
    expect(bars[2].total).toBe(1500);
  });

  it('should render svg element with bars in template', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const svg = compiled.querySelector('svg');
    expect(svg).toBeTruthy();

    const barGroups = compiled.querySelectorAll('.chart-bar-group');
    expect(barGroups.length).toBe(3);
  });

  it('should compute stacked segments for multi-source earnings', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    const day1Bars = component.bars()[0];
    expect(day1Bars.segments.length).toBe(3); // goals (500), tasks (200), pomodoro (300)
    expect(day1Bars.segments.map(s => s.source)).toEqual(['goals', 'dailyTasks', 'pomodoro']);
  });

  it('should update hover state on mouse enter and clear on mouse leave', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    component.onBarMouseEnter(mockRecords[0], { clientX: 100, clientY: 200 } as MouseEvent);
    expect(component.hoveredRecord()).toEqual(mockRecords[0]);
    expect(component.tooltipPosition()).toEqual({ x: 110, y: 215 });

    component.onBarMouseLeave();
    expect(component.hoveredRecord()).toBeNull();
    expect(component.tooltipPosition()).toBeNull();
  });

  it('should correctly stack segment heights and positions from baseline', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    const day1Bars = component.bars()[0];
    // Baseline is 225
    // Each segment must stack above the previous
    expect(day1Bars.segments.length).toBe(3);
    const goalsSeg = day1Bars.segments[0];
    const tasksSeg = day1Bars.segments[1];
    const pomodoroSeg = day1Bars.segments[2];

    expect(goalsSeg.y).toBeGreaterThan(tasksSeg.y);
    expect(tasksSeg.y).toBeGreaterThan(pomodoroSeg.y);
  });

  it('should render tooltip breakdown when hovered', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    component.onBarMouseEnter(mockRecords[0], { clientX: 100, clientY: 200 } as MouseEvent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tooltip = compiled.querySelector('.chart-tooltip');
    expect(tooltip).toBeTruthy();
    expect(tooltip?.textContent).toContain('Goals: 500 ₴');
    expect(tooltip?.textContent).toContain('Daily Tasks: 200 ₴');
    expect(tooltip?.textContent).toContain('Pomodoro: 300 ₴');
  });

  it('should toggle tooltip on bar click', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    component.onBarClick(mockRecords[0], { clientX: 100, clientY: 200 } as MouseEvent);
    expect(component.hoveredRecord()).toEqual(mockRecords[0]);

    // Second click on same bar dismisses it
    component.onBarClick(mockRecords[0], { clientX: 100, clientY: 200 } as MouseEvent);
    expect(component.hoveredRecord()).toBeNull();
  });

  it('should thin labels when record count exceeds 16', () => {
    const manyRecords: DailyEarningsRecord[] = Array.from({ length: 30 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      totalEarned: 100,
      goalsEarned: 100,
      dailyTasksEarned: 0,
      pomodoroEarned: 0,
      dailyScoresEarned: 0,
    }));

    fixture.componentRef.setInput('records', manyRecords);
    fixture.detectChanges();

    const bars = component.bars();
    expect(bars.length).toBe(30);
    const visibleLabels = bars.filter(b => b.shouldShowLabel);
    expect(visibleLabels.length).toBeLessThan(30);
    expect(visibleLabels.length).toBeGreaterThan(0);
    expect(bars[0].shouldShowLabel).toBe(true);
    expect(bars[29].shouldShowLabel).toBe(true);
  });

  it('should handle empty records gracefully', () => {
    fixture.componentRef.setInput('records', []);
    fixture.detectChanges();

    expect(component.bars().length).toBe(0);
    expect(component.maxDailyEarned()).toBe(500);
  });

  it('should update tooltip position on mouse move if bar is hovered', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    component.onBarMouseEnter(mockRecords[0], { clientX: 100, clientY: 200 } as MouseEvent);
    component.onBarMouseMove({ clientX: 150, clientY: 250 } as MouseEvent);

    expect(component.tooltipPosition()).toEqual({ x: 160, y: 265 });
  });

  it('should display "No earnings recorded" in tooltip when day total is 0', () => {
    fixture.componentRef.setInput('records', mockRecords);
    fixture.detectChanges();

    component.onBarMouseEnter(mockRecords[1], { clientX: 100, clientY: 200 } as MouseEvent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const tooltip = compiled.querySelector('.chart-tooltip');
    expect(tooltip?.textContent).toContain('No earnings recorded');
  });
});
