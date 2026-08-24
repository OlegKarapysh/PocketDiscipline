<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.1.0
- List of modified principles:
  - Added: IV. SOLID Principles & Best Practices
- Added sections:
  - None
- Removed sections:
  - None
- Templates requiring updates:
  - .specify/templates/plan-template.md (✅ updated)
  - .specify/templates/spec-template.md (✅ updated)
  - .specify/templates/tasks-template.md (✅ updated)
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
Code style MUST be strictly enforced across the project. Use ESLint, EditorConfig, and Prettier for all code formatting. CI/CD and local environments MUST align to these configurations.

### IV. SOLID Principles & Best Practices
All code MUST adhere to SOLID principles (Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion) and established developer best practices. Code should be clean, readable, maintainable, and designed for extensibility.

## Development Standards

When developing new features, adherence to the vertical slice pattern is strictly enforced. Features should encapsulate their own routes, models, services, and UI components where applicable, avoiding "leaky" abstractions into generic shared folders unless absolutely necessary.

## Code Quality & Formatting

All code MUST comply with the configured ESLint and Prettier rules. Branches with formatting violations or linting errors will be rejected. 

## Governance

This Constitution supersedes all other practices. All Pull Requests and code reviews MUST verify compliance with these core principles.
Amendments to these principles require documentation and approval.

**Version**: 1.1.0 | **Ratified**: 2026-08-24 | **Last Amended**: 2026-08-24
