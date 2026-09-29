import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { SpeedDial } from './speed-dial';
import { Badge } from '../badge/badge';

describe('SpeedDial', () => {
  let fixture: ComponentFixture<SpeedDial>;

  const host = () => fixture.nativeElement as HTMLElement;
  const fab = () => host().querySelector<HTMLButtonElement>('button[mat-fab]')!;
  const actionLabels = () => Array.from(host().querySelectorAll('.action span')).map(label => label.textContent);

  const open = async () => {
    fab().click();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpeedDial],
      // Any standalone component without required inputs will do as the routed page.
      providers: [provideRouter([{ path: 'pomodoro', component: Badge }])],
    }).compileComponents();

    fixture = TestBed.createComponent(SpeedDial);
    fixture.componentRef.setInput('actions', [{ icon: 'timer', label: 'Start focus', path: '/pomodoro' }]);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should hide the actions until opened', () => {
    expect(actionLabels()).toEqual([]);
    expect(fab().getAttribute('aria-expanded')).toBe('false');
  });

  it('should show the actions when the button is clicked', async () => {
    await open();

    expect(actionLabels()).toEqual(['Start focus']);
    expect(fab().getAttribute('aria-expanded')).toBe('true');
  });

  it('should close on Escape', async () => {
    await open();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it('should close when the scrim is clicked', async () => {
    await open();

    host().querySelector<HTMLElement>('.scrim')!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it('should close when the app navigates away', async () => {
    await open();

    await TestBed.inject(Router).navigateByUrl('/pomodoro');

    expect(fixture.componentInstance.isOpen()).toBe(false);
  });
});
