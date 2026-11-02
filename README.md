# PocketDiscipline

## CI and deployment

- `.github/workflows/ci.yml` validates pull requests targeting `main`, and any branch when run by hand. New commits cancel superseded runs for that PR or branch.
- `.github/workflows/deploy.yml` validates pushes to `main` and manual runs on `main`, then deploys to GitHub Pages. Production runs are serialized without cancelling an active deployment; a manual run from another branch deploys nothing and stays out of that queue.
- `.github/workflows/validate.yml` is the shared reusable workflow. `Validation / Lint and unit tests` and `Validation / Build` run in parallel; `Validation / Smoke tests` then runs against the files the build job produced. With the `upload-pages-artifact` input (set by `deploy.yml`), the build job also uploads those same files as the Pages artifact, and deployment publishes it only after all three jobs succeed.

`npm run build:pages` makes the deployed build: base href `/PocketDiscipline/`, and `index.html` copied to `404.html` so GitHub Pages boots the app on a deep link. The smoke server follows Pages: real files, a folder's `index.html`, and `404.html` with status 404 for anything else.

Each runner job has a 15-minute timeout. Run `npm run e2e:smoke` locally to build and smoke-test that deployed build; `npm run e2e` runs the full suite against the development server.

## Coding agents

Codex, Antigravity, and Claude Code share `AGENTS.md` and the skills in `.agents/skills/`.
`CLAUDE.md` imports the shared instructions. Angular MCP uses the same local CLI command in
`.codex/config.toml`, `.agents/mcp_config.json`, and `.mcp.json`, respectively.

Edit skills only in `.agents/skills/`, then run `npm run skills:sync` and include the generated
`.claude/skills/` changes with the sources. `npm run lint:skills` checks parity without writing;
it also runs as part of `npm run lint`. The generator adds Claude invocation metadata and marks
its output. Unexpected Claude skill folders are reported for manual reconciliation, never deleted.
Keep supporting resources in the canonical skill folder and use paths relative to the checkout.

Spec Kit upgrades can replace skill files: reconcile upstream changes in `.agents/skills/`, retain
project-specific instructions, then regenerate Claude copies. Do not maintain separate skill bodies.
No edit hook stages Git changes; staging and committing happen only when requested.
