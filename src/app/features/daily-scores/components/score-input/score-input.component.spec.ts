import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { By } from '@angular/platform-browser';
import { ScoreInputComponent } from './score-input.component';

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

    const buttons = fixture.debugElement.queryAll(By.css('button.score-btn'));
    expect(buttons.length).toBe(10);
    expect(buttons[0].nativeElement.textContent.trim()).toBe('1');
    expect(buttons[9].nativeElement.textContent.trim()).toBe('10');
  });

  it('should update internalSelectedScore when a score button is clicked', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = fixture.debugElement.queryAll(By.css('button.score-btn'));
    buttons[4].nativeElement.click(); // score 5
    fixture.detectChanges();

    expect(component.internalSelectedScore()).toBe(5);
    expect(component.activeTier()?.label).toBe('Moderate Discipline');
  });

  it('should not update internalSelectedScore when readonly is true', async () => {
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    await fixture.whenStable();

    component.selectScore(10);
    expect(component.internalSelectedScore()).toBeNull();
  });

  it('should emit scoreSubmitted when submit is clicked with selected score', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    let emittedScore: number | null = null;
    component.scoreSubmitted.subscribe((score) => {
      emittedScore = score;
    });

    const buttons = fixture.debugElement.queryAll(By.css('button.score-btn'));
    buttons[9].nativeElement.click(); // score 10
    fixture.detectChanges();
    await fixture.whenStable();

    const submitBtn = fixture.debugElement.query(By.css('button.submit-button'));
    expect(submitBtn).toBeTruthy();
    submitBtn.nativeElement.click();

    expect(emittedScore).toBe(10);
  });

  it('should sync internalSelectedScore when selectedScore input changes', () => {
    fixture.componentRef.setInput('selectedScore', 5);
    fixture.detectChanges();

    expect(component.internalSelectedScore()).toBe(5);
  });

  it('should render feedback banner when a score is selected', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = fixture.debugElement.queryAll(By.css('button.score-btn'));
    buttons[0].nativeElement.click(); // score 1
    fixture.detectChanges();
    await fixture.whenStable();

    const feedbackBanner = fixture.debugElement.query(By.css('.feedback-banner'));
    expect(feedbackBanner).toBeTruthy();
    expect(component.internalSelectedScore()).toBe(1);
    expect(component.activeTier()?.label).toBe('Low Discipline');
  });

  it('should render readonly score display when readonly is true', async () => {
    fixture.componentRef.setInput('readonly', true);
    fixture.componentRef.setInput('selectedScore', 10);
    fixture.detectChanges();
    await fixture.whenStable();

    const readonlyDisplay = fixture.debugElement.query(By.css('.readonly-score-display'));
    expect(readonlyDisplay).toBeTruthy();
    expect(readonlyDisplay.nativeElement.textContent).toContain('10');
  });
});
