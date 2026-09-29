<!--
Sync Impact Report:
- Version change: 1.2.0 → 1.3.0
- List of modified principles:
  - Expanded: III. Consistent Code Style now binds `docs/code_style.md`, not only the tool configs
- Added sections:
  - None
- Removed sections:
  - Code Quality & Formatting (duplicated Principle III)
- Templates requiring updates:
  - .specify/templates/plan-template.md (✅ updated)
  - .specify/templates/spec-template.md (✅ no change: code conventions are not a spec-level constraint)
  - .specify/templates/tasks-template.md (✅ no change: its lint task already covers the tool configs)
  - .agents/skills/speckit-implement/SKILL.md (✅ updated: reads `docs/code_style.md`)
- Follow-up TODOs:
  - None
-->

# PocketDiscipline Constitution

## Core Principles

### I. Vertical Slice Architecture

Every new feature MUST use vertical slice architecture. Organize code by feature rather than technical layer to ensure features are cohesive, independently testable, and maintainable.

### II. Minimal Dependencies

Do not add unnecessary packages. The project MUST remain lightweight. Any new external dependencies must have a clear, justifiable purpose and be reviewed before inclusion.

### III. Consistent Code Style

All code MUST follow `docs/code_style.md`, the single source of code conventions. ESLint, EditorConfig, and Prettier MUST pass locally and in CI, and branches with lint or formatting violations are rejected. Conventions change in `docs/code_style.md`, not in this constitution.

### IV. SOLID Principles & Best Practices

All code MUST adhere to SOLID principles (Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion) and established developer best practices. Code should be clean, readable, maintainable, and designed for extensibility.

### V. Design System Compliance

All UI MUST follow `docs/design_system.md`: reuse the shared components before plain Angular Material, and style only through the theme and token layer. `scripts/check-ui.mjs`, part of `npm run lint`, MUST pass, and its baseline `scripts/ui-baseline.json` may only shrink.

## Development Standards

When developing new features, adherence to the vertical slice pattern is strictly enforced. Features should encapsulate their own routes, models, services, and UI components where applicable, avoiding "leaky" abstractions into generic shared folders unless absolutely necessary.

## Governance

This Constitution supersedes all other practices. All Pull Requests and code reviews MUST verify compliance with these core principles.
Amendments to these principles require documentation and approval.

**Version**: 1.3.0 | **Ratified**: 2026-08-24 | **Last Amended**: 2026-09-29
