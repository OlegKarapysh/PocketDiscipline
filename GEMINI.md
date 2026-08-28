# Project Rules

- Use vertical slice architecture for new features.
- Don't add unnecessary packages.
- **Verification with Linting**: After writing or modifying code, run `npm run lint` as a mandatory verification step. Fix any resulting lint errors before completing the task. Use `npm run lint -- --fix` for automated formatting fixes.
- Use Angular Material UI kit as the default for new components instead of creating custom ones.
- Refer to the official Angular v22 documentation for best practices and reference.
- Always ensure the Angular CLI MCP server is used when developing this project to leverage its workspace awareness, CLI automation, and official documentation access. If the server is not active or configured, prompt the user to start it via `ng mcp`.
- Do not commit code changes automatically. Let the user review and commit the changes manually.
- **Database Schema**: Always refer to `docs/schema.md` when writing or modifying any data access code, Dexie queries, or adding new features that interact with local storage.
- **Code Style**: Always adhere to the project's [Code Style Guidelines](docs/code_style.md).
