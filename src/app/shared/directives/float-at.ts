import { DestroyRef, Directive, ElementRef, afterRenderEffect, inject, input, signal } from '@angular/core';
import type { TooltipPosition } from '../models/tooltip-position.model';

// How far the host sits below and to the right of its anchor, so the pointer does not cover it.
const ANCHOR_GAP = { x: 10, y: 15 };
// The space kept between the host and the edges of the screen, unless the host only fits without it.
const SCREEN_MARGIN = 8;

const marginFor = (room: number, size: number) => Math.max(0, Math.min(SCREEN_MARGIN, (room - size) / 2));

// Places a `position: fixed` host, such as a chart tooltip, below and to the right of a point on the
// screen, and keeps the whole of it on screen: near the right edge it slides left, and when there is
// no room below the point it opens above it. It is placed again whenever the visible area changes: a
// resized window, a rotated phone, a pinch zoom. The host is measured where it is before it moves, so
// its size must not depend on its position: give it `width: max-content`.
// Usage: <div class="chart-tooltip" [appFloatAt]="tooltipAnchor()">
@Directive({ selector: '[appFloatAt]' })
export class FloatAt {
  readonly appFloatAt = input.required<TooltipPosition>();

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const root = host.ownerDocument.documentElement;
    // `position: fixed` measures from the layout viewport. A pinch zoom shows only part of it, the
    // visual viewport, which can sit anywhere inside it.
    const viewport = host.ownerDocument.defaultView?.visualViewport;
    const visibleArea = () =>
      viewport
        ? { left: viewport.offsetLeft, top: viewport.offsetTop, width: viewport.width, height: viewport.height }
        : { left: 0, top: 0, width: root.clientWidth, height: root.clientHeight };
    const screen = signal(visibleArea());
    const remeasure = () => {
      screen.set(visibleArea());
    };

    const listening = new AbortController();
    for (const type of ['resize', 'scroll']) {
      viewport?.addEventListener(type, remeasure, { signal: listening.signal });
    }
    inject(DestroyRef).onDestroy(() => {
      listening.abort();
    });

    afterRenderEffect({
      earlyRead: () => {
        const anchor = this.appFloatAt();
        const area = screen();
        const { width, height } = host.getBoundingClientRect();
        const marginX = marginFor(area.width, width);
        const marginY = marginFor(area.height, height);
        const minLeft = area.left + marginX;
        const maxLeft = area.left + area.width - marginX - width;
        const minTop = area.top + marginY;
        const maxTop = area.top + area.height - marginY - height;
        const below = anchor.y + ANCHOR_GAP.y;
        const above = anchor.y - ANCHOR_GAP.y - height;
        // Below the point if it fits, else above it; with room for neither, as low as fits.
        const top = below <= maxTop || above < minTop ? Math.max(minTop, Math.min(below, maxTop)) : above;
        return { left: Math.max(minLeft, Math.min(anchor.x + ANCHOR_GAP.x, maxLeft)), top };
      },
      write: (position) => {
        const { left, top } = position();
        host.style.left = `${String(left)}px`;
        host.style.top = `${String(top)}px`;
      },
    });
  }
}
