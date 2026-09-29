import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  let fixture: ComponentFixture<EmptyState>;

  const render = async (inputs: Record<string, string>) => {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyState],
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyState);
  });

  it('should render the heading and message', async () => {
    const host = await render({ heading: 'No habits yet', message: 'Add one small thing.' });

    expect(host.querySelector('.heading')?.textContent).toBe('No habits yet');
    expect(host.querySelector('.message')?.textContent).toBe('Add one small thing.');
  });

  it('should render no message or button when they are not given', async () => {
    const host = await render({ heading: 'No habits yet' });

    expect(host.querySelector('.message')).toBeNull();
    expect(host.querySelector('button')).toBeNull();
  });

  it('should emit action when the action button is clicked', async () => {
    const host = await render({ heading: 'No habits yet', actionLabel: 'New habit' });
    const action = vi.fn();
    fixture.componentInstance.action.subscribe(action);

    host.querySelector('button')!.click();

    expect(action).toHaveBeenCalledTimes(1);
  });
});
