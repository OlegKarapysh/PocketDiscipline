import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DATE_LOCALE_CA } from '../../../core/constants/date-locale.const';
import { BarChart } from './bar-chart';
import type { BarChartBar } from './bar-chart-bar.model';
import type { BarChartScale } from './bar-chart-scale.model';
import type { BarChartSegment } from './bar-chart-segment.model';
import type { BarChartTooltip } from './bar-chart-tooltip.model';

describe('BarChart', () => {
  let component: BarChart;
  let fixture: ComponentFixture<BarChart>;

  const SCALE: BarChartScale = { max: 100, tickLabels: ['0', '25', '50', '75', '100'] };

  const bar = (key: string, segments: BarChartSegment[] = [], tooltip: Partial<BarChartTooltip> = {}): BarChartBar => ({
    key,
    axisLabel: `${key.slice(5, 7)}/${key.slice(8)}`,
    ariaLabel: `${key}: bar`,
    segments,
    tooltip: { title: key, rows: [], ...tooltip },
  });
  const day = (offset: number) => new Date(2026, 0, 1 + offset).toLocaleDateString(DATE_LOCALE_CA);
  const days = (count: number) =>
    Array.from({ length: count }, (_, i) => bar(day(i), [{ value: 10, tone: 'primary' }]));
  // One bar per month from January 2020, labelled like a monthly chart ("Jan '20").
  const months = (count: number) =>
    Array.from({ length: count }, (_, i): BarChartBar => {
      const start = new Date(2020, i, 1);
      const label = `${start.toLocaleDateString('en-US', { month: 'short' })} '${String(start.getFullYear()).slice(-2)}`;
      return { ...bar(start.toLocaleDateString(DATE_LOCALE_CA)), axisLabel: label };
    });

  const render = (bars: BarChartBar[], scale = SCALE, width?: number) => {
    if (width !== undefined) {
      component.width.set(width);
    }
    fixture.componentRef.setInput('bars', bars);
    fixture.componentRef.setInput('scale', scale);
    fixture.detectChanges();
  };

  const host = () => fixture.nativeElement as HTMLElement;
  const attr = (element: Element | null | undefined, name: string) => Number(element?.getAttribute(name));
  const groups = () => Array.from(host().querySelectorAll('.chart-bar-group'));
  const labelledIndexes = () => groups().flatMap((group, i) => (group.querySelector('.axis-label') ? [i] : []));
  const labelCentres = () =>
    groups()
      .flatMap((group) => group.querySelector('.axis-label') ?? [])
      .map((t) => attr(t, 'x'));
  const tooltip = () => host().querySelector('.chart-tooltip');

  const pointer = (pointerType: string, clientX = 100, clientY = 200) =>
    ({ pointerType, clientX, clientY }) as PointerEvent;
  // A bar the browser reports as focused from the keyboard, or by a tap or a click.
  const focusOn = (keyboard: boolean) => {
    const element = document.createElement('div');
    vi.spyOn(element, 'matches').mockReturnValue(keyboard);
    return { currentTarget: element } as unknown as FocusEvent;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarChart],
    }).compileComponents();

    fixture = TestBed.createComponent(BarChart);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('ariaLabel', 'Daily test chart');
  });

  it('should label the chart and every bar for screen readers', () => {
    render(days(2));

    expect(host().querySelector('svg')?.getAttribute('aria-label')).toBe('Daily test chart');
    expect(groups().map((group) => group.getAttribute('aria-label'))).toEqual(['2026-01-01: bar', '2026-01-02: bar']);
    expect(groups().every((group) => group.getAttribute('tabindex') === '0')).toBe(true);
  });

  it('should draw only the axes when there are no bars', () => {
    render([]);

    expect(groups()).toHaveLength(0);
    expect(host().querySelectorAll('.grid-line')).toHaveLength(5);
  });

  it('should start the plot after the widest tick label', () => {
    render(days(1), { max: 150_000, tickLabels: ['0', '50 000', '100 000', '150 000'] });

    // "150 000" is seven 11px Geist Mono glyphs, about 46px wide, drawn right-aligned at its x.
    const tickX = attr(host().querySelector('.axis-label[text-anchor="end"]'), 'x');
    expect(tickX).toBeGreaterThanOrEqual(7 * 6.6);
    expect(attr(host().querySelector('.grid-line'), 'x1')).toBeGreaterThan(tickX);
    expect(attr(host().querySelector('.bar-hitbox'), 'x')).toBeGreaterThan(tickX);
  });

  it('should stack segments from the baseline at their share of the scale', () => {
    render([
      bar(day(0), [
        { value: 50, tone: 'reward' },
        { value: 25, tone: 'primary' },
      ]),
    ]);

    // The hit box spans the whole plot, from the top of the scale down to the baseline.
    const plot = host().querySelector('.bar-hitbox');
    const plotHeight = attr(plot, 'height');
    const baseline = attr(plot, 'y') + plotHeight;
    const [first, second] = Array.from(host().querySelectorAll('.bar-segment'));

    expect(attr(first, 'height')).toBeCloseTo(plotHeight * 0.5);
    expect(attr(first, 'y') + attr(first, 'height')).toBeCloseTo(baseline);
    expect(attr(second, 'height')).toBeCloseTo(plotHeight * 0.25);
    expect(attr(second, 'y') + attr(second, 'height')).toBeCloseTo(attr(first, 'y'));
    expect([first, second].map((segment) => segment.getAttribute('data-tone'))).toEqual(['reward', 'primary']);
    expect(host().querySelector('.zero-bar')).toBeNull();
  });

  it('should draw the zero bar for a bar with no segments or only zero ones', () => {
    render([bar(day(0)), bar(day(1), [{ value: 0, tone: 'primary' }]), bar(day(2), [{ value: 5, tone: 'primary' }])]);

    expect(groups().map((group) => group.querySelector('.zero-bar') !== null)).toEqual([true, true, false]);
    expect(host().querySelectorAll('.bar-segment')).toHaveLength(1);
  });

  describe('x-axis labels', () => {
    it('should label every bar up to 10 bars', () => {
      render(days(10), SCALE, 1200);

      expect(labelledIndexes()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should label every 2nd bar above 10 bars, and always the last one', () => {
      render(days(11), SCALE, 1200);

      expect(labelledIndexes()).toEqual([0, 2, 4, 6, 8, 10]);
    });

    it('should label every 5th bar above 16 bars, and always the last one', () => {
      render(days(17), SCALE, 1200);

      expect(labelledIndexes()).toEqual([0, 5, 10, 16]);
    });

    it('should show about 7 labels above 31 bars, the first and last among them', () => {
      render(days(40), SCALE, 1200);

      const labelled = labelledIndexes();
      expect(labelled.length).toBeGreaterThanOrEqual(6);
      expect(labelled.length).toBeLessThanOrEqual(8);
      expect(labelled[0]).toBe(0);
      expect(labelled.at(-1)).toBe(39);
    });

    it('should label every day of a week on a wide chart', () => {
      render(days(7), SCALE, 600);

      expect(labelCentres()).toHaveLength(7);
    });

    it('should keep neighbouring day labels from overlapping on a phone-width chart', () => {
      render(days(7), SCALE, 280);

      const centres = labelCentres();
      const gaps = centres.slice(1).map((centre, i) => centre - centres[i]);
      // A label such as "09/24" is five 11px Geist Mono glyphs, about 32px wide.
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(32);
    });

    it('should keep neighbouring month labels from overlapping on a phone-width chart', () => {
      render(months(24), SCALE, 280);

      const centres = labelCentres();
      const gaps = centres.slice(1).map((centre, i) => centre - centres[i]);
      // A label such as "Jan '25" is seven 11px Geist Mono glyphs, about 46px wide.
      expect(Math.min(...gaps)).toBeGreaterThanOrEqual(46);
    });

    it('should keep the first and last labels inside a phone-width chart', () => {
      // 84 months, so the bars are narrow enough that the outer labels would overhang the edges.
      render(months(84), SCALE, 280);

      // A label is drawn centred on its x, so half of its width lies on either side.
      const halfLabel = (7 * 6.6) / 2;
      const centres = labelCentres();
      expect(centres[0] - halfLabel).toBeGreaterThanOrEqual(0);
      expect((centres.at(-1) ?? 0) + halfLabel).toBeLessThanOrEqual(280);
    });
  });

  describe('tooltip', () => {
    const KEYS = [day(0), day(1)];

    beforeEach(() => {
      render(days(2));
    });

    const tooltipTitle = () => tooltip()?.querySelector('.tooltip-title')?.textContent.trim();
    const show = () => {
      fixture.detectChanges();
    };

    it('should open on mouse hover, follow the pointer and close when the pointer leaves', () => {
      component.onBarPointerEnter(KEYS[0], pointer('mouse'));
      show();
      expect(tooltipTitle()).toBe(KEYS[0]);
      expect(component.tooltipAnchor()).toEqual({ x: 100, y: 200 });

      component.onBarPointerMove(pointer('mouse', 150, 250));
      expect(component.tooltipAnchor()).toEqual({ x: 150, y: 250 });

      component.onBarPointerLeave(pointer('mouse'));
      show();
      expect(tooltip()).toBeNull();
    });

    it('should open with one tap and close with the next', () => {
      // A tap enters, leaves and focuses the bar before it clicks it.
      component.onBarPointerEnter(KEYS[1], pointer('touch'));
      component.onBarPointerLeave(pointer('touch'));
      component.onBarFocus(KEYS[1], focusOn(false));
      component.onBarClick(KEYS[1], pointer('touch'));
      show();
      expect(tooltipTitle()).toBe(KEYS[1]);

      component.onBarClick(KEYS[1], pointer('touch'));
      show();
      expect(tooltip()).toBeNull();
    });

    it('should move to another bar when that one is tapped', () => {
      component.onBarClick(KEYS[1], pointer('touch'));
      component.onBarClick(KEYS[0], pointer('touch', 40, 60));
      show();

      expect(tooltipTitle()).toBe(KEYS[0]);
      expect(component.tooltipAnchor()).toEqual({ x: 40, y: 60 });
    });

    it('should open on keyboard focus and close when that bar loses focus', () => {
      component.onBarFocus(KEYS[0], focusOn(true));
      show();
      expect(tooltipTitle()).toBe(KEYS[0]);

      component.onBarBlur(KEYS[1]);
      show();
      expect(tooltipTitle()).toBe(KEYS[0]);

      component.onBarBlur(KEYS[0]);
      show();
      expect(tooltip()).toBeNull();
    });

    it('should open when a bar is clicked in the page', () => {
      groups()[1].dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 30, clientY: 40 }));
      show();

      expect(tooltipTitle()).toBe(KEYS[1]);
    });
  });

  it('should show the tooltip rows: text, amount, signed amount, swatch, emphasis and note', () => {
    render([
      bar(day(0), [], {
        title: 'Monday',
        rows: [
          { label: 'Count', text: '3 / 10', emphasis: true },
          { label: 'Earned', amount: 1500 },
          { label: 'Reward', amount: 200, signedAmount: true, swatch: 'reward' },
        ],
        note: 'Nothing else',
      }),
    ]);
    component.onBarClick(day(0), pointer('mouse'));
    fixture.detectChanges();

    const rows = Array.from(tooltip()?.querySelectorAll('.tooltip-row') ?? []);
    expect(tooltip()?.querySelector('.tooltip-title')?.textContent.trim()).toBe('Monday');
    expect(rows.map((row) => row.querySelector('.row-label')?.textContent.trim())).toEqual([
      'Count',
      'Earned',
      'Reward',
    ]);
    expect(rows[0].querySelector('.row-text')?.textContent.trim()).toBe('3 / 10');
    // <app-amount> owns number formatting, the sign and the ₴ unit.
    expect(rows[1].querySelector('app-amount')?.textContent).toBe(`${(1500).toLocaleString('uk-UA')}₴`);
    expect(rows[2].querySelector('app-amount')?.textContent).toBe('+200₴');
    expect(rows.map((row) => row.querySelector('.swatch')?.getAttribute('data-tone') ?? null)).toEqual([
      null,
      null,
      'reward',
    ]);
    expect(rows.map((row) => row.classList.contains('emphasis'))).toEqual([true, false, false]);
    expect(tooltip()?.querySelector('.tooltip-note')?.textContent.trim()).toBe('Nothing else');
  });

  it('should hide the legend when it is empty', () => {
    render(days(1));

    expect(host().querySelector('.legend-container')).toBeNull();
  });

  it('should show each legend item with its tone', () => {
    fixture.componentRef.setInput('legend', [
      { label: 'Goals', tone: 'reward' },
      { label: 'Tasks', tone: 'primary' },
    ]);
    render(days(1));

    const items = Array.from(host().querySelectorAll('.legend-item'));
    expect(items.map((item) => item.textContent.trim())).toEqual(['Goals', 'Tasks']);
    expect(items.map((item) => item.querySelector('.swatch')?.getAttribute('data-tone'))).toEqual([
      'reward',
      'primary',
    ]);
  });
});
