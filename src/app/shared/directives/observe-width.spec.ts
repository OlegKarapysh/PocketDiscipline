import { ElementRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObserveWidth } from './observe-width';

describe('ObserveWidth', () => {
  const host = document.createElement('div');
  const observe = vi.fn();
  const disconnect = vi.fn();
  let resize: (width: number) => void;
  let widths: number[];

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      vi.fn(function (callback: ResizeObserverCallback) {
        resize = (width) => {
          callback([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver);
        };
        return { observe, unobserve: vi.fn(), disconnect };
      }),
    );
    TestBed.configureTestingModule({ providers: [{ provide: ElementRef, useValue: new ElementRef(host) }] });

    widths = [];
    const directive = TestBed.runInInjectionContext(() => new ObserveWidth());
    directive.appObserveWidth.subscribe((width) => widths.push(width));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('should observe its host element', () => {
    expect(observe).toHaveBeenCalledWith(host);
  });

  it('should emit the host width on every resize', () => {
    resize(320);
    resize(286.5);

    expect(widths).toEqual([320, 286.5]);
  });

  it('should not report a hidden host', () => {
    resize(0);

    expect(widths).toEqual([]);
  });

  it('should stop observing when destroyed', () => {
    TestBed.resetTestingModule();

    expect(disconnect).toHaveBeenCalled();
  });
});
