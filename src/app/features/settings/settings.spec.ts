import type { ComponentFixture} from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';
import { Settings } from './settings';
import { By } from '@angular/platform-browser';

describe('Settings', () => {
  let component: Settings;
  let fixture: ComponentFixture<Settings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Settings);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create settings component and render settings container', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.settings-container')).toBeTruthy();
  });

  it('should render link to manage categories', () => {
    const link = fixture.debugElement.query(By.css('.settings-link'));
    expect(link).toBeTruthy();
    const linkEl = link.nativeElement as HTMLElement;
    expect(linkEl.textContent).toContain('Manage Reward Categories');
  });
});
