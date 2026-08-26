# Implementation Plan: Pomodoro Timer

**Branch**: `[005-pomodoro-timer]` | **Date**: 2026-08-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-pomodoro-timer/spec.md`

## Summary

Implement a Pomodoro Timer feature in a dedicated tab that allows users to configure a session (15-120 mins), run it, and earn rewards based on engagement type (work/study). The app leverages OS local notifications via Service Worker for background support and persists completed sessions to IndexedDB using Dexie. For the reward system, it uses an Event-Driven architecture by emitting a reward event to a shared `EventBusService`, which the core `UserService` listens to for app-wide balance updates.

## Technical Context

**Language/Version**: TypeScript 6.0, Angular 22.1

**Primary Dependencies**: Angular Material, CDK, Dexie (IndexedDB), Angular Service Worker, RxJS (EventBus)

**Storage**: IndexedDB (via Dexie) for Session History (Balance is managed via EventBus by Core UserService)

**Testing**: Vitest (Unit), Playwright (E2E)

**Target Platform**: PWA (Web/Mobile)

**Project Type**: Web Application

**Performance Goals**: Timer runs accurately; UI updates without blocking main thread.

**Constraints**: Must work offline; must handle backgrounding gracefully via Service Worker notifications.

**Scale/Scope**: Local-first storage, single user profile.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Does the implementation use a Vertical Slice Architecture?
- [x] Have we minimized external dependencies (i.e., are all new packages strictly necessary)? (No new packages needed)
- [x] Will the new code comply with ESLint, EditorConfig, and Prettier configurations?
- [x] Does the design adhere to SOLID principles and established developer best practices?

## Project Structure

### Documentation (this feature)

```text
specs/005-pomodoro-timer/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
└── app/
    ├── core/
    │   └── services/
    │       ├── event-bus.service.ts     # [NEW] App-wide event bus
    │       └── user.service.ts          # [UPDATE] Listen to RewardEarnedEvent
    └── features/
        └── pomodoro/
            ├── components/
            │   ├── timer-display/
            │   ├── timer-controls/
            │   ├── session-config/
            │   └── completion-dialog/
            ├── models/
            │   └── pomodoro-session.model.ts
            ├── services/
            │   ├── pomodoro-timer.service.ts
            │   └── pomodoro-storage.service.ts
            └── pomodoro.routes.ts
```

**Structure Decision**: Using Vertical Slice Architecture by placing all Pomodoro-related code in `src/app/features/pomodoro`. Models, services, components, and routing are encapsulated. To avoid siloing the app-wide balance, an Event-Driven architecture is used via a shared `EventBusService` in `src/app/core/services/` that the `UserService` subscribes to.
