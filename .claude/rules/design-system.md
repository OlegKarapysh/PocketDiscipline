---
paths:
  - 'src/app/**/*.html'
  - 'src/app/**/*.scss'
  - 'src/styles.scss'
  - 'src/styles/**'
---

# UI changes follow the design system

Before changing markup or styles, read `.agents/skills/pocketdiscipline-ui/SKILL.md` and follow it.
Claude Code does not load skills from `.agents/skills/`, so open the file directly. `docs/design_system.md`
is the source of truth; the skill says how to apply it.

A hook runs `scripts/check-ui.mjs` on every file you edit under `src/app` and again before you finish.
When it reports a regression, fix the code. `scripts/ui-baseline.json` may only shrink; edits to it
are denied, and `node scripts/check-ui.mjs --update-baseline` is the only way to rewrite it.
