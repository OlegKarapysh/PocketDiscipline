import { inputBinding, signal } from '@angular/core';
import type { DirectiveFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TooltipPosition } from '../models/tooltip-position.model';
import { FloatAt } from './float-at';

describe('FloatAt', () => {
  const SCREEN = { width: 360, height: 640 };
  const SIZE = { width: 200, height: 120 };
  const anchor = signal<TooltipPosition>({ x: 0, y: 0 });

  beforeEach(() => {
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(SCREEN.width);
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(SCREEN.height);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect(SIZE));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function floatAt(point: TooltipPosition): Promise<DirectiveFixture<FloatAt>> {
    anchor.set(point);
    const fixture = TestBed.createDirective(FloatAt, {
      tagName: 'div',
      bindings: [inputBinding('appFloatAt', anchor)],
    });
    await fixture.whenStable();
    return fixture;
  }

  function placement(fixture: DirectiveFixture<FloatAt>) {
    const { left, top } = (fixture.nativeElement as HTMLElement).style;
    return { left: parseFloat(left), top: parseFloat(top) };
  }

  function expectOnScreen({ left, top }: { left: number; top: number }): void {
    expect(left).toBeGreaterThanOrEqual(0);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(left + SIZE.width).toBeLessThanOrEqual(SCREEN.width);
    expect(top + SIZE.height).toBeLessThanOrEqual(SCREEN.height);
  }

  it('should open below and to the right of the anchor when it fits', async () => {
    const { left, top } = placement(await floatAt({ x: 40, y: 100 }));

    expect(left).toBeGreaterThan(40);
    expect(top).toBeGreaterThan(100);
  });

  it('should stay on screen next to the right edge', async () => {
    const position = placement(await floatAt({ x: 340, y: 100 }));

    expectOnScreen(position);
    expect(position.top).toBeGreaterThan(100);
  });

  it('should open above the anchor when there is no room below it', async () => {
    const position = placement(await floatAt({ x: 40, y: 600 }));

    expectOnScreen(position);
    expect(position.top + SIZE.height).toBeLessThan(600);
  });

  it('should stay on screen when there is room neither below nor above the anchor', async () => {
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(200);
    const { left, top } = placement(await floatAt({ x: 40, y: 100 }));

    expect(top).toBeGreaterThanOrEqual(0);
    expect(top + SIZE.height).toBeLessThanOrEqual(200);
    expect(left).toBeGreaterThan(40);
  });

  it('should follow the anchor when it moves', async () => {
    const fixture = await floatAt({ x: 40, y: 100 });

    anchor.set({ x: 340, y: 600 });
    await fixture.whenStable();

    const position = placement(fixture);
    expectOnScreen(position);
    expect(position.top + SIZE.height).toBeLessThan(600);
  });
});
