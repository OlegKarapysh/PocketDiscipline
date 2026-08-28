# Code Style Guidelines

When writing or modifying code in this project, always adhere to the following rules:

- **No Magic Values**: Code must not have any magic numbers or strings. Use named constants or enums instead.
- **SOLID Principles**: Code must satisfy the Single Responsibility Principle (SRP) and Dependency Inversion Principle (DIP).
- **Angular Components**: All Angular components must have HTML templates and CSS styles in separate files. Do not use inline templates or styles.
- **One Class/Enum per File**: All TypeScript files should contain no more than one `class` or `enum`.
- **Simplicity**: Code must be simple, readable, and understandable.
- **Self-Describing Code**: Avoid writing comments. Code must be self-describing. Use comments only for explaining non-obvious things (e.g., complex business logic or workarounds).
