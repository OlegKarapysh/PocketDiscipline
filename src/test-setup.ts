// jsdom has no ResizeObserver, and ObserveWidth constructs one for every chart. This one never
// fires; a spec that needs resize events stubs its own.
if (typeof ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
}
