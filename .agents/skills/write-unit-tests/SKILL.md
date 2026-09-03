---
name: "write-unit-tests"
description: "Author behavior-driven, high-value unit tests in Angular v22 and TypeScript using Vitest, grounded in feature specs, business logic, DOM interactions, and thorough edge case coverage."
---

# Write Unit Tests

## Goal
Create meaningful, maintainable, and behavior-driven unit tests for Angular components, services, directives, pipes, and utility modules using Vitest and Angular Testing Utilities.

---

## Core Principles

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

### 4. Ground in Business Logic & Reactive Streams
- **Reactive Streams & Dexie Live Queries**: When services expose streams (e.g. `tasks$`, `user$`), test stream emissions using `firstValueFrom` or subscriptions, verifying initial values, fallbacks, and side-effects (e.g. streak resets).
- **Boundary & Edge Case Coverage**:
  - Empty collections, zero values, negative numbers, maximum limits, off-by-one dates.
  - Failure/rejection handling: verify that database errors or rejected promises fail gracefully without breaking UI state.

### 5. Adhere to Project Code Style ([docs/code_style.md](docs/code_style.md))
- **No Over-Extraction of Mock Values**: Do NOT extract single-use, self-documenting literals into top-of-file constants (e.g., avoid `SCORE_BTN_INDEX_ZERO = 0`, `TEST_SCORE_TEN = 10`, `ZERO_VALUE = 0`). Use inline literals directly (`buttons[0]`, `score: 10`, `0`).
- **Extract Obscure Constants Only**: Extract into named constants only when values represent domain meaning and are not immediately obvious (e.g., `86_400_000` -> `ONE_DAY_MS`).
- **Type-Safe Mocks**: Type mock dependencies accurately with `ReturnType<typeof vi.fn>` or typed partials. Avoid `any`.

---

## Reference Patterns

### Pattern A: Service with Public Contract & Fake Timers
```typescript
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { ReminderService } from './reminder.service';
import { DailyScoresService } from '../../features/daily-scores/services/daily-scores.service';

describe('ReminderService', () => {
  let service: ReminderService;
  let dailyScoresServiceMock: { getTodayScore: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();

    dailyScoresServiceMock = {
      getTodayScore: vi.fn().mockReturnValue(of(undefined)),
    };

    TestBed.configureTestingModule({
      providers: [
        ReminderService,
        { provide: DailyScoresService, useValue: dailyScoresServiceMock },
      ],
    });

    service = TestBed.inject(ReminderService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should schedule reminder and trigger notification when score is missing', async () => {
    const notificationSpy = vi.fn();
    vi.stubGlobal('Notification', notificationSpy);
    (Notification as unknown as { permission: string }).permission = 'granted';

    await service.scheduleDailyReminder();

    // Fast-forward to scheduled reminder time
    await vi.advanceTimersToNextTimerAsync();

    expect(notificationSpy).toHaveBeenCalledWith(
      'Pocket Discipline',
      expect.objectContaining({ body: 'Time to set your daily score!' })
    );
  });
});
```

### Pattern B: Service with Reactive LiveQuery Stream
```typescript
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { DailyTasksService } from './daily-tasks.service';
import { DbService } from '../../../core/services/db.service';
import { UserService } from '../../../core/services/user.service';

const ONE_DAY_MS = 86_400_000;

describe('DailyTasksService', () => {
  let service: DailyTasksService;
  let dbMock: {
    dailyTasks: {
      toArray: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    dbMock = {
      dailyTasks: {
        toArray: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue(1),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        DailyTasksService,
        { provide: DbService, useValue: dbMock },
        { provide: UserService, useValue: { addBalance: vi.fn() } },
      ],
    });

    service = TestBed.inject(DailyTasksService);
  });

  it('should reset broken streak to 0 when task was last completed more than 1 day ago', async () => {
    const staleTask = {
      id: 'task-1',
      title: 'Workout',
      streak: 5,
      lastCompletedAt: Date.now() - (2 * ONE_DAY_MS),
    };
    dbMock.dailyTasks.toArray.mockResolvedValue([staleTask]);

    const tasks = await firstValueFrom(service.tasks$);

    expect(tasks[0].streak).toBe(0);
    expect(dbMock.dailyTasks.update).toHaveBeenCalledWith('task-1', { streak: 0 });
  });
});
```

### Pattern C: Component with Signals, DOM Events, and Template Branching
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { TaskFormComponent } from './task-form.component';

describe('TaskFormComponent', () => {
  let component: TaskFormComponent;
  let fixture: ComponentFixture<TaskFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should enable submit button and emit output when valid title is typed', async () => {
    let emittedTask: { title: string } | null = null;
    component.taskCreated.subscribe(data => (emittedTask = data));

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
