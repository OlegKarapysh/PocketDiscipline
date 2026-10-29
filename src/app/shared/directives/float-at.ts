import { Directive, ElementRef, afterRenderEffect, inject, input } from '@angular/core';
import type { TooltipPosition } from '../models/tooltip-position.model';

// How far the host sits below and to the right of its anchor, so the pointer does not cover it.
const ANCHOR_GAP = { x: 10, y: 15 };
// The least space kept between the host and the edges of the screen.
const SCREEN_MARGIN = 8;

// Places a `position: fixed` host, such as a chart tooltip, below and to the right of a point on the
// screen, and keeps the whole of it on screen: near the right edge it slides left, and when there is
// no room below the point it opens above it. The host is measured where it is before it moves, so its
// size must not depend on its position: give it `width: max-content`.
// Usage: <div class="chart-tooltip" [appFloatAt]="tooltipAnchor()">
@Directive({ selector: '[appFloatAt]' })
export class FloatAt {
  readonly appFloatAt = input.required<TooltipPosition>();

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterRenderEffect({
      earlyRead: () => {
        const anchor = this.appFloatAt();
        const { width, height } = host.getBoundingClientRect();
        const { clientWidth, clientHeight } = host.ownerDocument.documentElement;
        const maxLeft = clientWidth - SCREEN_MARGIN - width;
        const maxTop = clientHeight - SCREEN_MARGIN - height;
        const below = anchor.y + ANCHOR_GAP.y;
        const above = anchor.y - ANCHOR_GAP.y - height;
        // Below the point if it fits, else above it; with room for neither, as low as fits.
        const top = below <= maxTop || above < SCREEN_MARGIN ? Math.max(SCREEN_MARGIN, Math.min(below, maxTop)) : above;
        return { left: Math.max(SCREEN_MARGIN, Math.min(anchor.x + ANCHOR_GAP.x, maxLeft)), top };
      },
      write: (position) => {
        const { left, top } = position();
        host.style.left = `${String(left)}px`;
        host.style.top = `${String(top)}px`;
      },
    });
  }
}
