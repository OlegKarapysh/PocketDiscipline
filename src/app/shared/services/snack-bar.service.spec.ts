import { TestBed } from '@angular/core/testing';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SnackBarService } from './snack-bar.service';

const TOAST_WIDTH = 300;
const TOAST_HEIGHT = 48;

class FakeSnackBarRef {
  readonly opened = new Subject<void>();
  readonly dismissed = new Subject<void>();
  readonly dismiss = vi.fn();
  afterOpened = () => this.opened.asObservable();
  afterDismissed = () => this.dismissed.asObservable();
}

describe('SnackBarService', () => {
  let service: SnackBarService;
  let matSnackBarMock: { open: ReturnType<typeof vi.fn> };
  let refs: FakeSnackBarRef[];
  let overlay: HTMLElement;

  // Stands in for the container Material renders into the overlay when a toast opens.
  const renderToast = (height = TOAST_HEIGHT) => {
    const container = document.createElement('div');
    container.className = 'mat-mdc-snack-bar-container';
    container.setPointerCapture = vi.fn();
    container.getBoundingClientRect = () => new DOMRect(0, 0, TOAST_WIDTH, height);
    const surface = document.createElement('div');
    surface.className = 'mat-mdc-snackbar-surface';
    surface.getBoundingClientRect = () => new DOMRect(0, 0, TOAST_WIDTH, height);
    container.append(surface);
    overlay.append(container);
    return { container, surface };
  };

  const openToast = (message = 'Goal added') => {
    service.show(message);
    const ref = refs.at(-1)!;
    const toast = renderToast();
    ref.opened.next();
    return { ref, ...toast };
  };

  const pointer = (target: HTMLElement, type: string, clientX: number) => {
    target.dispatchEvent(new PointerEvent(type, { pointerId: 1, isPrimary: true, button: 0, clientX, bubbles: true }));
  };

  const swipe = (target: HTMLElement, distance: number) => {
    pointer(target, 'pointerdown', 100);
    pointer(target, 'pointermove', 100 + distance / 2);
    pointer(target, 'pointermove', 100 + distance);
    pointer(target, 'pointerup', 100 + distance);
  };

  beforeEach(() => {
    refs = [];
    matSnackBarMock = {
      open: vi.fn(() => {
        const ref = new FakeSnackBarRef();
        refs.push(ref);
        return ref;
      }),
    };

    TestBed.configureTestingModule({
      providers: [SnackBarService, { provide: MatSnackBar, useValue: matSnackBarMock }],
    });

    service = TestBed.inject(SnackBarService);
    overlay = TestBed.inject(OverlayContainer).getContainerElement();
  });

  afterEach(() => {
    overlay.replaceChildren();
  });

  it('should open the snackbar with the Close action and the shared duration', () => {
    service.show('Goal added');

    expect(matSnackBarMock.open).toHaveBeenCalledWith('Goal added', 'Close', { duration: 3000 });
  });

  it('should surface the message of an Error', () => {
    service.error(new Error('A goal with this title already exists.'));

    expect(matSnackBarMock.open).toHaveBeenCalledWith('A goal with this title already exists.', 'Close', {
      duration: 3000,
    });
  });

  it('should fall back to a generic message for a non-Error', () => {
    service.error('something went wrong');

    expect(matSnackBarMock.open).toHaveBeenCalledWith('Unknown error occurred', 'Close', {
      duration: 3000,
    });
  });

  it('should use a caller-supplied fallback for a non-Error', () => {
    service.error(undefined, 'Failed to load categories');

    expect(matSnackBarMock.open).toHaveBeenCalledWith('Failed to load categories', 'Close', {
      duration: 3000,
    });
  });

  it('should prefer the Error message over a caller-supplied fallback', () => {
    service.error(new Error('Delete failed'), 'Failed to delete');

    expect(matSnackBarMock.open).toHaveBeenCalledWith('Delete failed', 'Close', { duration: 3000 });
  });

  describe('height', () => {
    it('should be 0 while no toast is open', () => {
      expect(service.height()).toBe(0);
    });

    it('should report the open toast and drop to 0 once it is dismissed', () => {
      const { ref, container } = openToast();

      expect(service.height()).toBe(TOAST_HEIGHT);

      container.remove();
      ref.dismissed.next();

      expect(service.height()).toBe(0);
    });

    it('should keep the next toast when the one it replaced finishes leaving', () => {
      const first = openToast('First');
      service.show('Second');
      first.container.remove();
      first.ref.dismissed.next();
      renderToast(72);
      refs[1].opened.next();

      expect(service.height()).toBe(72);
    });
  });

  describe('swipe to dismiss', () => {
    it('should dismiss a toast swiped far enough to either side', () => {
      const right = openToast('Right');
      swipe(right.surface, TOAST_WIDTH * 0.5);

      expect(right.ref.dismiss).toHaveBeenCalled();

      right.container.remove();
      right.ref.dismissed.next();
      const left = openToast('Left');
      swipe(left.surface, -TOAST_WIDTH * 0.5);

      expect(left.ref.dismiss).toHaveBeenCalled();
    });

    it('should snap a short swipe back and keep the toast', () => {
      const { ref, surface } = openToast();

      swipe(surface, TOAST_WIDTH * 0.1);

      expect(ref.dismiss).not.toHaveBeenCalled();
      expect(surface.style.transform).toBe('');
    });

    it('should leave a tap alone so the Close button still gets it', () => {
      const { ref, container, surface } = openToast();

      swipe(surface, 3);

      expect(ref.dismiss).not.toHaveBeenCalled();
      expect(container.setPointerCapture).not.toHaveBeenCalled();
    });

    it('should snap back when the browser cancels the gesture', () => {
      const { ref, surface } = openToast();

      pointer(surface, 'pointerdown', 100);
      pointer(surface, 'pointermove', 100 + TOAST_WIDTH * 0.5);
      pointer(surface, 'pointercancel', 100 + TOAST_WIDTH * 0.5);

      expect(ref.dismiss).not.toHaveBeenCalled();
      expect(surface.style.transform).toBe('');
    });
  });
});
