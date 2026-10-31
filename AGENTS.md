# PocketDiscipline — agent instructions

These rules apply to every agent working here (Antigravity, Claude Code, Gemini CLI, …). This file
holds the project _workflow_ rules and points to the sources for everything else; it deliberately
does not repeat what they say.

## Sources of truth

Read these before writing or reviewing code:

1. **[docs/code_style.md](docs/code_style.md)** — the single source of truth for code conventions:
   naming, component state, teardown, forms, constants, SCSS, templates, layering, and which Angular
   v22 defaults must not be written out. Every rule there carries a real anti-example from this repo.
   If a convention needs to change, change it there. Do not restate a rule here — a rule that lives
   in two places drifts.
2. **[docs/schema.md](docs/schema.md)** — required reading before writing or modifying any data
   access code, Dexie queries, or features that interact with local storage.
3. **[docs/design_system.md](docs/design_system.md)** — the source of truth for UI, read before any UI
   change together with the `pocketdiscipline-ui` skill. Agents that do not discover skills under
   `.agents/skills/` (e.g. Claude Code) must read `.agents/skills/pocketdiscipline-ui/SKILL.md`
   directly. Its "Responsive layout" section is the contract for every screen.

## Workflow rules

- Use vertical slice architecture for new features. The layering rule that follows from it
  (`core/` must never import `features/`) is rule 8 in the code style guide.
- Don't add unnecessary packages.
- **Linting**: after writing or modifying code, run `npm run lint` as a mandatory verification step
  and fix any resulting errors before completing the task. Use `npm run lint -- --fix` for automated
  formatting fixes. **Never use `eslint-disable` comments or similar suppression directives to hide
  or bypass lint errors and code style violations. Structurally fix the underlying issue instead.**
- **UI work**: reuse the shared components in `src/app/shared/components` first, then plain Angular
  Material, before building anything custom. Before touching `.html` or `.scss` under `src/app`, or
  adding a screen, read `.agents/skills/pocketdiscipline-ui/SKILL.md`. `npm run lint` includes
  `scripts/check-ui.mjs`, a ratchet against `scripts/ui-baseline.json`: fix what it reports and never
  edit the baseline by hand. The app is used on phones and on wide desktops alike, so every screen
  must fit both: `npm run e2e` includes the layout audit (`e2e/src/layout-audit.spec.ts`). Run it
  before finishing any UI change; "Verifying" in `docs/design_system.md` says what to register in it
  for anything new.
- Do not commit code changes automatically. Let the user review and commit the changes manually.
- **Clarification and context**: always ask clarifying questions before proceeding if there is
  insufficient context, ambiguity, or missing information to understand the user's intention or
  task requirements.

## Verification

Treat all four as the definition of done:

```bash
npm run lint && npm run typecheck && npm test -- --watch=false && npm run e2e
```

The e2e suite is too slow for CI, which runs lint, typecheck and the unit tests only. A local, unversioned
pre-push hook (`.git/hooks/pre-push`) runs `npm run lint`; committing runs no checks, so lint before
you commit. Run `npm run e2e` locally, always for UI changes (it holds the layout audit).

## Angular version

This project is on Angular 22. Several long-standing defaults changed in v22 — `OnPush`, zoneless,
`@Service`, signal forms. **Do not assert version-dependent Angular behaviour from memory.** Verify
against the official Angular v22 documentation, `node_modules/@angular/`, or the `angular-cli` MCP
server (`get_best_practices`, `search_documentation`), which is configured project-scoped in
`.mcp.json`. The v22 defaults table in `docs/code_style.md` records what has already been verified.

Always use the Angular CLI MCP server when developing this project, for its workspace awareness, CLI
automation and official documentation access. If the server is not active or configured, prompt the
user to start it via `ng mcp`.
