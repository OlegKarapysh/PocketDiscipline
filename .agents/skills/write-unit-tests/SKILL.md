---
name: "write-unit-tests"
description: "Author behavior-driven, high-value unit tests in Angular and TypeScript using Vitest, grounded in feature specs, business logic, and thorough edge case coverage."
---

# Write Unit Tests

## Goal
Create meaningful, maintainable, and behavior-driven unit tests for Angular components, services, directives, pipes, and utility modules using Vitest and Angular Testing Utilities.

---

## Core Principles

1. **Test Intended Behavior, Not Implementation Details**:
   - Focus on inputs, observable outputs, user actions, DOM rendering, and public state/event contracts.
   - Do NOT test private methods or internal state variables directly.
   - Avoid shallow tests that only assert component instantiation (e.g., sole `expect(component).toBeTruthy()`).

2. **Mandatory Edge Case & Boundary Coverage**:
   - **Boundary Values**: Test zero values, maximum/minimum limits, off-by-one conditions, negative values, and empty arrays/strings.
   - **Invalid & Incomplete Data**: Test `null`, `undefined`, missing optional fields, or unexpected data payloads.
   - **State & Concurrency Edge Cases**: Test rapid successive interactions, uncompleted asynchronous tasks, cancellations, and duplicate requests.
   - **Error & Failure Modes**: Verify graceful fallback behavior, user-facing error indicators, and failure recovery.

3. **Ground in Business Logic & Specifications**:
   - Consult relevant feature specs (`specs/`), data schema (`docs/schema.md`), and domain rules prior to writing test cases.
   - Map tests directly to acceptance criteria and business requirements.

4. **Follow Project Code Style & Standards**:
   - **No Magic Numbers/Strings**: Define meaningful named constants or test fixture helpers ([Code Style](docs/code_style.md)).
   - **Type Safety**: Avoid using `any` for mocks where typed partials or interfaces can be used.
   - **Modern Angular v22 & Vitest**: Use Vitest API (`describe`, `it`, `expect`, `vi`, `beforeEach`) and modern Angular testing paradigms (`setInput` for signal inputs, `TestBed`, `fixture.whenStable()`, `By.css`).

---

## Execution Workflow

### Step 1: Context & Specification Analysis
- Identify the target file to be tested (e.g., `*.service.ts`, `*.component.ts`).
- Read the target source code, its imported models/types, and any relevant feature specifications (`specs/**/spec.md`, `docs/schema.md`).
- Identify the public interface, business rules, invariants, validation constraints, and side effects (e.g., database writes, balance updates, event emissions).

### Step 2: Design Test Matrix (Arrange-Act-Assert)
Formulate a test matrix covering both primary flows and essential edge cases:
- **Primary Behavior (Happy Path)**: Does the unit satisfy its primary use cases under normal inputs?
- **Edge Cases & Boundaries**:
  - Empty collections or blank input strings.
  - Zero/negative numeric values (e.g. balance, rewards, quantities).
  - Maximum length or capacity limits.
  - Boundary dates/times (e.g. end of day, timezone shifts).
- **Error & Failure Scenarios**:
  - Rejected promises / database transaction rollbacks.
  - Validation failures and error messaging.
- **State & DOM Transitions**:
  - Signal changes and reactivity updates.
  - Conditional rendering (empty states vs populated states).

### Step 3: Implement the Spec File
Create or update `[target].spec.ts` following these structural patterns:

#### A. Service / Business Logic Unit Test
```typescript
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TargetService } from './target.service';
import { DependencyService } from '../../core/services/dependency.service';

describe('TargetService', () => {
  let service: TargetService;
  let dependencyMock: { performAction: ReturnType<typeof vi.fn> };

  const TEST_ID = 'test-id-123';
  const ZERO_VALUE = 0;

  beforeEach(() => {
    dependencyMock = {
      performAction: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TargetService,
        { provide: DependencyService, useValue: dependencyMock },
      ],
    });

    service = TestBed.inject(TargetService);
  });

  it('should calculate and persist state change when action is triggered', async () => {
    // Arrange
    dependencyMock.performAction.mockResolvedValue({ success: true });

    // Act
    await service.execute(TEST_ID);

    // Assert
    expect(dependencyMock.performAction).toHaveBeenCalledWith(TEST_ID);
  });

  it('should handle zero value boundary edge case gracefully without errors', async () => {
    // Arrange & Act
    const result = await service.calculateBalance(ZERO_VALUE);

    // Assert
    expect(result).toBe(ZERO_VALUE);
  });
});
```

#### B. Component Behavioral Unit Test
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { By } from '@angular/platform-browser';
import { TargetComponent } from './target.component';

describe('TargetComponent', () => {
  let component: TargetComponent;
  let fixture: ComponentFixture<TargetComponent>;

  const SAMPLE_TITLE = 'Sample Task';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TargetComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TargetComponent);
    component = fixture.componentInstance;
  });

  it('should render item details and emit action when user interacts', async () => {
    // Arrange (Signal Inputs)
    fixture.componentRef.setInput('itemTitle', SAMPLE_TITLE);
    fixture.detectChanges();
    await fixture.whenStable();

    // Assert rendered DOM
    const titleEl = fixture.debugElement.query(By.css('.item-title'));
    expect(titleEl.nativeElement.textContent).toContain(SAMPLE_TITLE);

    // Act (User interaction)
    const button = fixture.debugElement.query(By.css('button.action-btn'));
    button.nativeElement.click();

    // Assert behavior / output emission
  });

  it('should render empty state message when items list is empty', async () => {
    // Arrange
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();
    await fixture.whenStable();

    // Assert
    const emptyStateEl = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyStateEl).toBeTruthy();
  });
});
```

### Step 4: Verification & Linting
1. Run the test suite:
   ```bash
   npm run test -- --watch=false
   ```
2. Verify formatting and linting:
   ```bash
   npm run lint
   ```
   (If any issues arise, fix them using `npm run lint -- --fix` or manual adjustment).
