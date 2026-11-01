import { Service, inject, signal } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';

const SNACKBAR_DURATION_MS = 3000;
// A finger drifts a few pixels during a tap; below this a press on Close is still a tap.
const SWIPE_SLOP_PX = 8;
// Share of the toast's width a swipe has to cover before letting go dismisses it.
const SWIPE_DISMISS_RATIO = 0.3;
const SWIPE_SETTLE_TRANSITION = 'transform 150ms ease-out, opacity 150ms ease-out';

@Service()
export class SnackBarService {
  private snackBar = inject(MatSnackBar);
  private overlayContainer = inject(OverlayContainer);

  private current: MatSnackBarRef<TextOnlySnackBar> | null = null;
  private readonly heightState = signal(0);
  /** Height in px of the toast on screen, 0 when none is open. The shell lifts the speed dial by it. */
  readonly height = this.heightState.asReadonly();

  show(message: string): void {
    const ref = this.snackBar.open(message, 'Close', { duration: SNACKBAR_DURATION_MS });
    this.current = ref;
    ref.afterOpened().subscribe(() => {
      this.attach(ref);
    });
  }

  error(e: unknown, fallback = 'Unknown error occurred'): void {
    this.show(e instanceof Error ? e.message : fallback);
  }

  // Opening a toast replaces the previous one only after that one has left the DOM, so once this
  // one has opened it is the only snackbar container in the overlay.
  private attach(ref: MatSnackBarRef<TextOnlySnackBar>): void {
    const container = this.overlayContainer
      .getContainerElement()
      .querySelector<HTMLElement>('.mat-mdc-snack-bar-container');
    if (!container) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (this.current === ref) {
        this.heightState.set(container.getBoundingClientRect().height);
      }
    });
    observer.observe(container);
    this.heightState.set(container.getBoundingClientRect().height);
    this.enableSwipe(container, ref);

    ref.afterDismissed().subscribe(() => {
      observer.disconnect();
      if (this.current === ref) {
        this.current = null;
        this.heightState.set(0);
      }
    });
  }

  private enableSwipe(container: HTMLElement, ref: MatSnackBarRef<TextOnlySnackBar>): void {
    // Material's enter animation holds the container's transform, so the gesture moves the surface.
    const surface = container.querySelector<HTMLElement>('.mat-mdc-snackbar-surface');
    if (!surface) {
      return;
    }

    let pointerId: number | null = null;
    let startX = 0;
    let offset = 0;
    let dragging = false;

    const release = (): void => {
      pointerId = null;
      if (!dragging) {
        return;
      }
      dragging = false;
      const width = surface.getBoundingClientRect().width;
      surface.style.transition = SWIPE_SETTLE_TRANSITION;
      if (Math.abs(offset) >= width * SWIPE_DISMISS_RATIO) {
        surface.style.transform = `translateX(${Math.sign(offset) * width}px)`;
        surface.style.opacity = '0';
        ref.dismiss();
      } else {
        surface.style.transform = '';
        surface.style.opacity = '';
      }
    };

    container.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button !== 0) {
        return;
      }
      pointerId = event.pointerId;
      startX = event.clientX;
      offset = 0;
    });
    container.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) {
        return;
      }
      offset = event.clientX - startX;
      if (!dragging) {
        if (Math.abs(offset) < SWIPE_SLOP_PX) {
          return;
        }
        // Captured only once it is a drag: capturing on press would retarget a tap on Close.
        dragging = true;
        container.setPointerCapture(event.pointerId);
        surface.style.transition = 'none';
      }
      const width = surface.getBoundingClientRect().width;
      surface.style.transform = `translateX(${offset}px)`;
      surface.style.opacity = String(Math.max(0, 1 - Math.abs(offset) / width));
    });
    container.addEventListener('pointerup', (event) => {
      if (event.pointerId === pointerId) {
        release();
      }
    });
    container.addEventListener('pointercancel', (event) => {
      if (event.pointerId === pointerId) {
        offset = 0;
        release();
      }
    });
  }
}
