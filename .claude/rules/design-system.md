---
paths:
  - 'src/app/**/*.html'
  - 'src/app/**/*.scss'
  - 'src/styles.scss'
  - 'src/styles/**'
---

# UI changes follow the design system

Before changing markup or styles, use the `pocketdiscipline-ui` skill and follow it. The
discoverable `.claude/skills/pocketdiscipline-ui/` copy is generated from
`.agents/skills/pocketdiscipline-ui/SKILL.md`; edit only the canonical file in `.agents/skills/`.
`docs/design_system.md` is the source of truth; the skill says how to apply it.

A hook runs `scripts/check-ui.mjs` on every file you edit under `src/app` and again before you finish.
When it reports a regression, fix the code. `scripts/ui-baseline.json` may only shrink; edits to it
are denied, and `node scripts/check-ui.mjs --update-baseline` is the only way to rewrite it.

That hook cannot see layout. Every screen has to fit a 360px phone and a wide desktop, and
`npm run e2e` checks it with the layout audit (`e2e/src/layout-audit.spec.ts`). "Verifying" in
`docs/design_system.md` says what to register in it for anything new. Never add to its `KNOWN_GAPS`:
fix the layout instead.
