import Dexie from 'dexie';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';

// jsdom has no ResizeObserver, and ObserveWidth constructs one for every chart. This one never
// fires; a spec that needs resize events stubs its own.
if (typeof ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  };
}

// jsdom has no IndexedDB either. Every test gets its own in-memory one, so a database a test opens
// starts empty and nothing it writes reaches the next test. Dexie reads these when a database is
// constructed, so they must be in place before anything injects DbService.
beforeEach(() => {
  Dexie.dependencies.indexedDB = new IDBFactory();
  Dexie.dependencies.IDBKeyRange = IDBKeyRange;
});
