import { inputBinding, signal } from '@angular/core';
import type { DirectiveFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TooltipPosition } from '../models/tooltip-position.model';
import { FloatAt } from './float-at';

interface Area {
  left: number;
  top: number;
  width: number;
  height: number;
}

describe('FloatAt', () => {
  const SIZE = { width: 200, height: 120 };
  const PHONE: Area = { left: 0, top: 0, width: 360, height: 640 };
  const anchor = signal<TooltipPosition>({ x: 0, y: 0 });
  // jsdom has no visual viewport, so the specs give the window one they can resize and zoom.
  let viewport: EventTarget & { offsetLeft: number; offsetTop: number; width: number; height: number };

  function showArea({ left, top, width, height }: Area): void {
    Object.assign(viewport, { offsetLeft: left, offsetTop: top, width, height });
  }

  beforeEach(() => {
    viewport = Object.assign(new EventTarget(), { offsetLeft: 0, offsetTop: 0, width: 0, height: 0 });
    showArea(PHONE);
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(DOMRect.fromRect(SIZE));
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'visualViewport');
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

  function expectInside({ left, top }: { left: number; top: number }, area: Area): void {
    expect(left).toBeGreaterThanOrEqual(area.left);
    expect(top).toBeGreaterThanOrEqual(area.top);
    expect(left + SIZE.width).toBeLessThanOrEqual(area.left + area.width);
    expect(top + SIZE.height).toBeLessThanOrEqual(area.top + area.height);
  }

  it('should open below and to the right of the anchor when it fits', async () => {
    const { left, top } = placement(await floatAt({ x: 40, y: 100 }));

    expect(left).toBeGreaterThan(40);
    expect(top).toBeGreaterThan(100);
  });

  it('should stay on screen next to the right edge', async () => {
    const position = placement(await floatAt({ x: 340, y: 100 }));

    expectInside(position, PHONE);
    expect(position.top).toBeGreaterThan(100);
  });

  it('should open above the anchor when there is no room below it', async () => {
    const position = placement(await floatAt({ x: 40, y: 600 }));

    expectInside(position, PHONE);
    expect(position.top + SIZE.height).toBeLessThan(600);
  });

  it('should stay on screen when there is room neither below nor above the anchor', async () => {
    const short = { ...PHONE, height: 200 };
    showArea(short);
    const position = placement(await floatAt({ x: 40, y: 100 }));

    expectInside(position, short);
    expect(position.left).toBeGreaterThan(40);
  });

  it('should follow the anchor when it moves', async () => {
    const fixture = await floatAt({ x: 40, y: 100 });

    anchor.set({ x: 100, y: 300 });
    await fixture.whenStable();

    const { left, top } = placement(fixture);
    expect(left).toBeGreaterThan(100);
    expect(top).toBeGreaterThan(300);
  });

  it('should move back on screen when the window narrows', async () => {
    showArea({ left: 0, top: 0, width: 1280, height: 800 });
    const fixture = await floatAt({ x: 1000, y: 100 });

    showArea(PHONE);
    viewport.dispatchEvent(new Event('resize'));
    await fixture.whenStable();

    expectInside(placement(fixture), PHONE);
  });

  it('should stay inside the part of the page a pinch zoom shows', async () => {
    const zoomed = { left: 100, top: 200, width: 240, height: 400 };
    showArea(zoomed);

    expectInside(placement(await floatAt({ x: 330, y: 250 })), zoomed);
  });

  it('should fit an area only a little bigger than itself', async () => {
    const tight = { left: 100, top: 200, width: SIZE.width + 4, height: SIZE.height + 4 };
    showArea(tight);

    expectInside(placement(await floatAt({ x: 250, y: 250 })), tight);
  });

  it('should stay on screen where the browser has no visual viewport', async () => {
    Reflect.deleteProperty(window, 'visualViewport');
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(PHONE.width);
    vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(PHONE.height);

    expectInside(placement(await floatAt({ x: 340, y: 600 })), PHONE);
  });
});
