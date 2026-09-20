# PocketDiscipline — agent instructions

Read these two files before writing or reviewing code. They are the source; this file is only a
pointer and deliberately does not repeat what they say.

1. **[docs/code_style.md](docs/code_style.md)** — the single source of truth for code conventions:
   naming, component state, teardown, forms, constants, SCSS, templates, layering, and which Angular
   v22 defaults must not be written out. Every rule there carries a real anti-example from this repo.
2. **[GEMINI.md](GEMINI.md)** — project workflow rules (architecture, packages, verification,
   committing, the Angular CLI MCP server). They apply to every agent working here, not just Gemini.
3. **[docs/schema.md](docs/schema.md)** — required reading before touching Dexie queries or any data
   access code.

If a convention needs to change, change it in `docs/code_style.md`. Do not restate a rule here or in
`GEMINI.md` — a rule that lives in two places drifts.

## Verification

Treat all four as the definition of done:

```bash
npm run lint && npm run typecheck && npm test -- --watch=false && npm run e2e
```

## Angular version

This project is on Angular 22. Several long-standing defaults changed in v22 — `OnPush`, zoneless,
`@Service`, signal forms. **Do not assert version-dependent Angular behaviour from memory.** Verify
against `node_modules/@angular/` or the `angular-cli` MCP server (`get_best_practices`,
`search_documentation`), which is configured project-scoped in `.mcp.json`. The v22 defaults table in
`docs/code_style.md` records what has already been verified.
