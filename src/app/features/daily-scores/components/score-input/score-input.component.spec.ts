import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { ScoreInputComponent } from './score-input.component';

const TEST_SCORE_TEN = 10;
const TEST_SCORE_FIVE = 5;
const TOTAL_SCORE_BUTTONS = 10;

describe('ScoreInputComponent', () => {
  let component: ScoreInputComponent;
  let fixture: ComponentFixture<ScoreInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScoreInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ScoreInputComponent);
    component = fixture.componentInstance;
  });

  it('should render all 10 score selection buttons', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = fixture.debugElement.queryAll(By.css('button[mat-fab]'));
    expect(buttons.length).toBe(TOTAL_SCORE_BUTTONS);
    expect(buttons[0].nativeElement.textContent.trim()).toBe('1');
    expect(buttons[9].nativeElement.textContent.trim()).toBe('10');
  });

  it('should update internalSelectedScore when a score button is clicked', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = fixture.debugElement.queryAll(By.css('button[mat-fab]'));
    buttons[4].nativeElement.click(); // score 5
    fixture.detectChanges();

    expect(component.internalSelectedScore).toBe(TEST_SCORE_FIVE);
  });

  it('should not update internalSelectedScore when readonly is true', async () => {
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    await fixture.whenStable();

    component.selectScore(TEST_SCORE_TEN);
    expect(component.internalSelectedScore).toBeNull();
  });

  it('should emit scoreSubmitted when submit is clicked with selected score', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    let emittedScore: number | null = null;
    component.scoreSubmitted.subscribe((score) => {
      emittedScore = score;
    });

    const buttons = fixture.debugElement.queryAll(By.css('button[mat-fab]'));
    buttons[9].nativeElement.click(); // Select score 10
    fixture.detectChanges();
    await fixture.whenStable();

    const submitBtn = fixture.debugElement.query(By.css('button[mat-flat-button]'));
    expect(submitBtn).toBeTruthy();
    submitBtn.nativeElement.click();

    expect(emittedScore).toBe(TEST_SCORE_TEN);
  });

  it('should sync internalSelectedScore when selectedScore input changes', () => {
    component.selectedScore = TEST_SCORE_FIVE;
    component.ngOnChanges({
      selectedScore: {
        currentValue: TEST_SCORE_FIVE,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });

    expect(component.internalSelectedScore).toBe(TEST_SCORE_FIVE);
  });
});
