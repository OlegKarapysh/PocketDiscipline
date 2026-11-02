---
name: 'write-unit-tests'
description: 'Author behavior-driven, high-value unit tests in Angular v22 and TypeScript using Vitest, grounded in feature specs, business logic, DOM interactions, and thorough edge case coverage.'
---

<!-- Generated from .agents/skills/write-unit-tests/SKILL.md by npm run skills:sync. Do not edit here. -->

# Write Unit Tests

## Goal

Create meaningful, maintainable, and behavior-driven unit tests for Angular components, services, directives, pipes, and utility modules using Vitest and Angular Testing Utilities.

---

## Foundation: The 5 Principles of Unit Testing (Vladimir Khorikov)

When writing tests, always adhere to the foundational principles from _Unit Testing: Principles, Practices, and Patterns_:

1. **Aim for Sustainable Project Growth**: The ultimate goal of unit testing is to enable the project to grow sustainably over time. Avoid writing tests just to hit coverage metrics; tests should act as a safety net, not a maintenance burden.
2. **Maximize Protection Against Regressions**: Tests must effectively catch bugs when code breaks. Target complex business logic and domain code where regressions are most costly.
3. **Ensure Resistance to Refactoring (Most Critical)**: A test should not fail when you refactor the underlying code as long as the observable behavior remains the same. Avoid "false positives" by testing _observable behavior_ (the "what"), never _implementation details_ (the "how").
4. **Maintain Fast Feedback**: Tests must execute quickly so developers can run them frequently in a tight feedback loop.
5. **Prioritize Maintainability**: Tests must be easy to read, understand, and modify. A test is a first-class citizen of the codebase and should concisely express business intent.

> **The Trade-off Rule**: It is impossible to maximize Protection Against Regressions, Resistance to Refactoring, Fast Feedback, and Maintainability simultaneously. However, **Resistance to Refactoring is non-negotiable**.

---

## Angular Testing Practices

### 1. Test Intended Behavior via Public Contracts (Never Implementation Details)

- **Public API Only**: Test public methods, observable streams, inputs, outputs, and DOM elements.
- **Strictly Prohibit `(target as any)`**: Never bypass TypeScript encapsulation to call private methods or inspect private fields. If a private method contains complex logic, test it through the public methods that invoke it, or extract it into a pure utility function.
- **Avoid Shallow "Smoke" Tests**: A test asserting only `expect(component).toBeTruthy()` provides near-zero value. Always verify business requirements, state transitions, or rendered template output.

### 2. Strict Test Isolation & Zero Leaky State

- **Fresh Mocks Per Test**: Always instantiate mock objects inside `beforeEach()`. Never declare shared mutable mock instances at the file/module scope.
- **Clean Browser Globals**: If modifying or spying on `window`, `navigator`, or timers, restore them in `afterEach()` (`vi.restoreAllMocks()`, `vi.useRealTimers()`, or reset mutated properties).
- **Time-Dependent Logic**: Use Vitest fake timers (`vi.useFakeTimers()`, `vi.advanceTimersByTimeAsync()`) to test timers, countdowns, and schedulers rather than testing private timer internals.

### 3. Component Testing: DOM & User Interactions First

- **Interact Through the DOM**: Do not call component class methods (`component.submit()`) or mutate class properties when a user action exists. Simulate real interactions:
  - Clicks: `fixture.debugElement.query(By.css('button...')).nativeElement.click()`
  - Inputs: `inputEl.value = 'text'; inputEl.dispatchEvent(new Event('input'))`
- **Signal Inputs & Angular v22 APIs**: Use `fixture.componentRef.setInput('inputName', value)` to pass inputs.
- **Test Conditional Templates & Edge States**: Always verify `@if` branches (e.g. controls hidden when inactive vs visible when active), `@for` loops, empty states, and loading states.
- **Test Output Emissions**: When a child component emits an `output()`, assert that parent listeners or subscribers receive the expected payload upon DOM interactions.
- **No Redundant TestBed Boilerplate**: Do NOT use `.overrideComponent()` unless the component explicitly defines local `providers` in its `@Component` decorator.

### 4. Ground in Business Logic, Real IndexedDB & Reactive Streams

- **Real Database (`openEmptyDb`) — Never Mock Dexie**: `src/test-setup.ts` provides an isolated `fake-indexeddb` instance per test. Call `openEmptyDb()` from `src/app/shared/testing/empty-db.ts` for empty tables, seed the rows the test needs through it, and assert on what is stored afterwards — never on which Dexie table method was called. Prefer real services (`DbService`, `UserService`) over stubs; stub only external browser/UI boundaries such as dialogs, notifications, or the clock.
- **Reactive Streams & Dexie Live Queries**: When services expose streams (e.g. `tasks$`, `user$`), test stream emissions using `firstValueFrom` or subscriptions, verifying initial values, fallbacks, and persisted database state.
- **Boundary & Edge Case Coverage**:
  - Empty collections, zero values, negative numbers, maximum limits, off-by-one dates.
  - Failure/rejection handling: verify that validation errors or rejected promises fail gracefully without corrupting stored state.

### 5. Adhere to Project Code Style (`docs/code_style.md`)

- **No Over-Extraction of Mock Values**: Do NOT extract single-use, self-documenting literals into top-of-file constants (e.g., avoid `SCORE_BTN_INDEX_ZERO = 0`, `TEST_SCORE_TEN = 10`, `ZERO_VALUE = 0`). Use inline literals directly (`buttons[0]`, `score: 10`, `0`).
- **Extract Obscure Constants Only**: Extract into named constants only when values represent domain meaning and are not immediately obvious (e.g., `86_400_000` -> `ONE_DAY_MS`).
- **Type-Safe Mocks**: When stubbing external boundaries, type mock dependencies accurately with `ReturnType<typeof vi.fn>` or typed partials. Avoid `any`.

---

## Reference Patterns

### Pattern A: Service with Public Contract & Fake Timers

```typescript
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { DailyScoreReminderService } from './daily-score-reminder.service';
import { DailyScoresService } from './daily-scores.service';
import { BrowserNotificationService } from '../../../core/services/browser-notification.service';

describe('DailyScoreReminderService', () => {
  let service: DailyScoreReminderService;
  let notificationsMock: {
    requestPermission: ReturnType<typeof vi.fn>;
    show: ReturnType<typeof vi.fn>;
  };
  let dailyScoresMock: { getTodayScore: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();

    notificationsMock = {
      requestPermission: vi.fn().mockResolvedValue(true),
      show: vi.fn(),
    };
    dailyScoresMock = {
      getTodayScore: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        DailyScoreReminderService,
        { provide: BrowserNotificationService, useValue: notificationsMock },
        { provide: DailyScoresService, useValue: dailyScoresMock },
      ],
    });

    service = TestBed.inject(DailyScoreReminderService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should schedule reminder and trigger notification at 21:30 when score is missing', async () => {
    vi.setSystemTime(new Date(2026, 7, 28, 10, 0, 0));

    const granted = await firstValueFrom(service.scheduleDailyReminder());
    expect(granted).toBe(true);

    await vi.advanceTimersByTimeAsync(11.5 * 60 * 60 * 1000);

    expect(notificationsMock.show).toHaveBeenCalledWith(
      'Pocket Discipline',
      expect.objectContaining({ body: 'Time to set your daily score!' }),
    );
  });
});
```

### Pattern B: Service with Real Database (`openEmptyDb`) & LiveQuery Stream

```typescript
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { DailyTasksService } from './daily-tasks.service';
import type { DbService } from '../../../database/db.service';
import { openEmptyDb } from '../../../shared/testing/empty-db';
import type { DailyTask } from '../../../core/models/daily-task.model';
import type { DailyTaskDifficulty } from '../../../core/models/daily-task-difficulty.model';

const easy: DailyTaskDifficulty = { id: 'easy', name: 'Easy', baseReward: 100 };
const ONE_DAY_MS = 86_400_000;

describe('DailyTasksService', () => {
  let service: DailyTasksService;
  let db: DbService;

  beforeEach(async () => {
    db = await openEmptyDb();
    service = TestBed.inject(DailyTasksService);
  });

  it('should reset broken streak to 0 in stream and persist via resetBrokenStreaks when missed for more than 1 day', async () => {
    const staleTask: DailyTask = {
      id: 'task-1',
      title: 'Workout',
      difficulties: [easy],
      createdAt: Date.now() - 10 * ONE_DAY_MS,
      sortOrder: 0,
      streak: 5,
      lastCompletedAt: Date.now() - 2 * ONE_DAY_MS,
    };
    await db.dailyTasks.add(staleTask);

    const tasks = await firstValueFrom(service.tasks$);
    expect(tasks[0].streak).toBe(0);

    await service.resetBrokenStreaks();
    expect(await db.dailyTasks.get('task-1')).toEqual({ ...staleTask, streak: 0 });
  });
});
```

### Pattern C: Component with Signals, DOM Events, and Template Branching

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { TaskForm } from './task-form';

describe('TaskForm', () => {
  let component: TaskForm;
  let fixture: ComponentFixture<TaskForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskForm],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should enable submit button and emit output when valid title is typed', async () => {
    let emittedTask: { title: string } | null = null;
    component.taskCreated.subscribe((data) => (emittedTask = data));

    const input = fixture.debugElement.query(By.css('input[name="title"]')).nativeElement;
    input.value = 'Read 30 minutes';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();

    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submitBtn.nativeElement.disabled).toBe(false);

    submitBtn.nativeElement.click();

    expect(emittedTask).toEqual(expect.objectContaining({ title: 'Read 30 minutes' }));
  });

  it('should render empty state message when list is empty', async () => {
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();
    await fixture.whenStable();

    const emptyMsg = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyMsg).toBeTruthy();
    expect(emptyMsg.nativeElement.textContent).toContain('No items found');
  });

  it('should hide configuration controls when isActive is true', async () => {
    fixture.componentRef.setInput('isActive', true);
    fixture.detectChanges();
    await fixture.whenStable();

    const configPanel = fixture.debugElement.query(By.css('.config-panel'));
    expect(configPanel).toBeNull();
  });
});
```

---

## Verification & Execution Steps

1. Run single test file:
   ```bash
   npx vitest run src/app/path/to/target.spec.ts
   ```
2. Run full test suite:
   ```bash
   npm run test -- --watch=false
   ```
3. Mandatory lint verification:
   ```bash
   npm run lint
   ```
