import type { ComponentRef } from '@angular/core';
import { ApplicationRef, EnvironmentInjector, createComponent } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { SectionCard } from './section-card';

describe('SectionCard', () => {
  // Built with createComponent so content can be projected into the [sectionTools] slot directly.
  const create = (inputs: Record<string, string> = {}, tools: Node[] = []): ComponentRef<SectionCard> => {
    const ref = createComponent(SectionCard, {
      environmentInjector: TestBed.inject(EnvironmentInjector),
      projectableNodes: [tools, []],
    });
    for (const [name, value] of Object.entries(inputs)) {
      ref.setInput(name, value);
    }
    TestBed.inject(ApplicationRef).attachView(ref.hostView);
    ref.changeDetectorRef.detectChanges();
    return ref;
  };

  const header = (ref: ComponentRef<SectionCard>) => (ref.location.nativeElement as HTMLElement).querySelector('.header')!;

  it('should leave the header empty, and so hidden, without a heading, action or tools', () => {
    const ref = create();

    expect(header(ref).matches(':empty')).toBe(true);
  });

  it('should render the heading', () => {
    const ref = create({ heading: 'Earnings' });

    expect(header(ref).querySelector('h2')?.textContent).toBe('Earnings');
  });

  it('should render section tools even without a heading', () => {
    const tools = document.createElement('span');
    const ref = create({}, [tools]);

    expect(header(ref).contains(tools)).toBe(true);
    expect(header(ref).matches(':empty')).toBe(false);
  });

  it('should emit action when the action button is clicked', () => {
    const ref = create({ actionLabel: 'All tasks' });
    const action = vi.fn();
    ref.instance.action.subscribe(action);

    header(ref).querySelector<HTMLButtonElement>('button')!.click();

    expect(action).toHaveBeenCalledTimes(1);
  });
});
