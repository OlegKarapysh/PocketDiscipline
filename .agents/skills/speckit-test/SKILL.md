---
name: "speckit-test"
description: "Run the project's verification gates (lint, typecheck, unit tests, E2E) to verify implementation."
---

## Goal
Run every gate in the definition of done from `AGENTS.md` and verify that all of them pass.
If a gate fails, attempt to fix it or report the failure to the user.

## Execution Steps
1. Run `npm run verify` in the project root. It runs `npm run lint`, `npm run typecheck`, `npm test -- --watch=false` and `npm run e2e` in order and stops at the first failure.
2. If it succeeds, output a success message naming the four gates that passed.
3. If a gate fails, analyze the error output and fix the underlying code (never suppress a lint rule or weaken a test), then run `npm run verify` again. If you cannot fix it, stop and ask the user for guidance.
