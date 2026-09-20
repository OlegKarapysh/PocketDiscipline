# Project Rules

Code conventions live in **[docs/code_style.md](docs/code_style.md)** — the single source of truth
for naming, component state, teardown, forms, constants, SCSS, templates and layering. Read it
before writing code, and change a convention there rather than restating one here. The rules below
are project *workflow* rules, which is a separate concern.

- Use vertical slice architecture for new features. The layering rule that follows from it
  (`core/` must never import `features/`) is rule 8 in the code style guide.
- Don't add unnecessary packages.
- **Verification with Linting**: After writing or modifying code, run `npm run lint` as a mandatory verification step. Fix any resulting lint errors before completing the task. Use `npm run lint -- --fix` for automated formatting fixes. **Never use `eslint-disable` comments or similar suppression directives to hide or bypass lint errors and code style violations. You must structurally fix the underlying code issue instead.**
- Use Angular Material UI kit as the default for new components instead of creating custom ones.
- Refer to the official Angular v22 documentation for best practices and reference.
- Always ensure the Angular CLI MCP server is used when developing this project to leverage its workspace awareness, CLI automation, and official documentation access. If the server is not active or configured, prompt the user to start it via `ng mcp`.
- Do not commit code changes automatically. Let the user review and commit the changes manually.
- **Database Schema**: Always refer to `docs/schema.md` when writing or modifying any data access code, Dexie queries, or adding new features that interact with local storage.
- **Code Style**: Always adhere to the project's [Code Style Guidelines](docs/code_style.md).
- **Clarification and Context**: Always ask clarifying questions before proceeding if there is insufficient context, ambiguity, or missing information to understand the user's intention or task requirements.

