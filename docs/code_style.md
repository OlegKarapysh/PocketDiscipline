# Code Style Guidelines

When writing or modifying code in this project, always adhere to the following rules:

- **Avoid Obscure Magic Values**: Extract strings and numbers into constants or enums ONLY when they are shared across multiple files, or when their meaning is not immediately obvious (e.g. `86_400_000` -> `ONE_DAY_MS`). Do NOT extract literal values if they are used locally only once and are self-documenting in context, or if they are arbitrary mock values in unit tests.
- **SOLID Principles**: Code must satisfy the Single Responsibility Principle (SRP) and Dependency Inversion Principle (DIP).
- **Angular Components**: All Angular components must have HTML templates and CSS styles in separate files. Do not use inline templates or styles.
- **One Class/Enum/Interface per File**: All TypeScript files should contain no more than one `class` or `enum` or `interface`.
- **Simplicity**: Code must be simple, readable, and understandable.
- **Self-Describing Code**: Avoid writing comments. Code must be self-describing. Use comments only for explaining non-obvious things (e.g., complex business logic or workarounds).
