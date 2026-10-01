import { DestroyRef, Directive, ElementRef, inject, output } from '@angular/core';

// Emits the host's content width once laid out and on every resize, for SVG charts that draw at
// one user unit per CSS pixel so their text keeps its real size on a phone. A hidden host (width 0)
// is not reported, so a chart keeps its last real width instead of collapsing.
// Usage: <div (appObserveWidth)="width.set($event)">
@Directive({ selector: '[appObserveWidth]' })
export class ObserveWidth {
  readonly appObserveWidth = output<number>();

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) {
        this.appObserveWidth.emit(width);
      }
    });
    observer.observe(host);
    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
    });
  }
}
