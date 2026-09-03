import { describe, expect, it } from 'vitest';
import { POMODORO_ROUTES } from './pomodoro.routes';
import { PomodoroContainer } from './pomodoro-container/pomodoro-container';

describe('POMODORO_ROUTES', () => {
  it('should define root route pointing to PomodoroContainer component', () => {
    const rootRoute = POMODORO_ROUTES.find(r => r.path === '');
    expect(rootRoute).toBeDefined();
    expect(rootRoute?.component).toBe(PomodoroContainer);
  });
});
