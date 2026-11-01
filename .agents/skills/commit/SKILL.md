---
name: 'commit'
description: 'Create small, atomic Git commits (at most 15 files per commit) that each describe a single logical change using the repository Conventional Commits style. Use whenever the user asks to commit changes.'
---

# Creating Commits

## Goal

Keep the Git history clean, reviewable, and bisectable by ensuring every commit represents **one logical change**, touches **at most 15 files**, and follows the repository's established commit message style.

This skill is agent-agnostic and applies equally to Antigravity, Claude Code, Codex, and any other coding agent working in this repository.

---

## Hard Rules

1. **Never commit without being asked.** Follow `AGENTS.md`: do not commit code changes automatically; only create commits when the user explicitly requests it.
2. **One logical change per commit.** Never bundle unrelated changes (e.g., mixing a CI workflow change, a feature fix, and a broad test refactor) into the same commit. If a commit message requires "and" to connect two distinct changes, split the commit.
3. **At most 15 files per commit.** A single commit may create, modify, or delete **no more than 15 files**.
   - If a logical change touches more than 15 files (for example, a mechanical rename or E2E route update across 18 specs), split it into coherent, self-contained batches of at most 15 files each.
4. **Never commit untracked scratch or local config files.** Workspace hooks may run `git add -A` automatically after edits. Always reset the index (`git reset`) and stage explicit file paths (`git add <file...>`) so untracked files (like local reports, plans, or `.codex/`) are not swept into a commit.
5. **Lint before committing.** Committing runs no Git hooks (`.git/hooks/pre-push` only runs on push). Ensure `npm run lint` passes before creating the commit.

---

## Commit Message Style

Follow the repository's established Conventional Commits format:

```text
<type>(<optional-scope>): <concise imperative summary>

<optional body paragraph wrapped at ~72 characters explaining the why,
key design choices, or non-obvious trade-offs.>
```

- **Allowed `<type>` values**:
  - `feat`: new user-facing feature or capability
  - `fix`: bug fix
  - `refactor`: code restructuring with no behavior change
  - `test`: adding or updating unit / E2E tests
  - `ci`: GitHub Actions workflows and CI scripts
  - `docs`: documentation-only changes
  - `chore`: build config, tooling, or dependency updates (e.g., `chore(deps): ...`)
- **Subject line**:
  - Imperative mood (`add`, `fix`, `run`, `preserve`, not `added` or `adds`).
  - Lowercase immediately after `<type>: `, no trailing period, <= 72 characters.
- **Body (when needed)**:
  - Separate from the subject line with one blank line.
  - Omit the body for small, self-explanatory changes; include a concise 2–5 line paragraph when context, trade-offs, or verification details help future readers.

### Examples from this repository

Single-line commit (self-explanatory change):

```text
fix: preserve speed dial backdrop above toasts
```

Commit with explanatory body:

```text
test: run unit specs on a real in-memory IndexedDB

Every test gets its own fake-indexeddb factory, so specs exercise the real
DbService schema, upgrades, transactions and live queries. openEmptyDb()
gives a test empty tables. Replaces the Dexie mocks and fake tables copied
across 16 specs; assertions now check stored rows, not table calls.
```

---

## Step-by-Step Workflow

1. **Inspect working tree and reset auto-staged files**:
   ```bash
   git reset
   git status --short
   ```
2. **Plan the commit batches**:
   - Group modified/created/deleted files by logical change.
   - Verify each planned commit has **<= 15 files** and a single clear purpose.
3. **Run verification**:
   - Ensure `npm run lint` passes (plus `npm run typecheck`, unit tests, and E2E tests as required by `AGENTS.md`).
4. **Stage and verify each commit batch**:
   ```bash
   git add <file1> <file2> ...
   git diff --cached --name-status
   ```
   Confirm that:
   - Only files belonging to this single change are staged.
   - The number of staged files is between 1 and 15.
5. **Commit with a matching message**:
   ```bash
   git commit -m "<type>: <summary>"
   ```
   (Or pass a second `-m "<body paragraph>"` when a body is warranted.)
6. **Repeat** steps 4–5 for any remaining batches, then verify with `git log -n <count> --stat` and `git status --short`.
