import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { StreakBadge } from './streak-badge';

describe('StreakBadge', () => {
  let fixture: ComponentFixture<StreakBadge>;

  const render = async (days: number, compact = false) => {
    fixture.componentRef.setInput('days', days);
    fixture.componentRef.setInput('compact', compact);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreakBadge],
    }).compileComponents();

    fixture = TestBed.createComponent(StreakBadge);
  });

  it('should label an active streak with its length', async () => {
    const host = await render(12);

    expect(host.textContent).toContain('12-day streak');
    expect(host.classList.contains('inactive')).toBe(false);
  });

  it('should show only the count when compact', async () => {
    const host = await render(12, true);

    expect(host.querySelector('span')?.textContent).toBe('12');
  });

  it('should invite the user to start a streak at 0 days, even when compact', async () => {
    expect((await render(0)).textContent).toContain('Start a streak today');
    expect((await render(0, true)).textContent).toContain('Start a streak today');
  });

  it('should mark a 0-day streak as inactive', async () => {
    const host = await render(0);

    expect(host.classList.contains('inactive')).toBe(true);
  });
});
