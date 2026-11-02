---
name: 'pr-review'
description: 'Conduct an expert-level, multi-perspective pull request review by orchestrating three parallel subagents (Senior Software Engineer, Software Architect, Cybersecurity Expert) and synthesizing their findings into an actionable report.'
user-invocable: true
disable-model-invocation: false
---

<!-- Generated from .agents/skills/pr-review/SKILL.md by npm run skills:sync. Do not edit here. -->

# Expert Pull Request Review

## Goal

Perform an exhaustive, multi-dimensional code review of a pull request or branch diff by dispatching three specialized subagents in parallel (Senior Software Engineer, Software Architect, Cybersecurity Expert) and aggregating their findings into a cohesive, prioritized review report.

---

## Core Principles

1. **Multi-Perspective Triangulation**:
   - Each reviewer subagent operates with an independent, dedicated domain focus.
   - Cross-cutting concerns are evaluated independently to prevent blind spots.
2. **Grounded in Project Architecture & Guidelines**:
   - Enforce Vertical Slice Architecture.
   - Enforce `docs/code_style.md` (naming conventions, no magic numbers, explicit types).
   - Enforce `docs/schema.md` for data persistence and Dexie operations.
   - Enforce `docs/design_system.md` for every UI change (shared components, theme tokens, `scripts/check-ui.mjs`).
   - Enforce `docs/security.md` for local data protection, untrusted imports, browser rendering, secrets, dependencies, and deployment.
   - Adhere to Angular v22 zoneless/signals best practices and Angular Material UI usage.
3. **Actionable & Constructive Feedback**:
   - Classify findings clearly: **CRITICAL** (blocking bugs/security flaws), **MAJOR** (architectural/functional issues), and **MINOR** (nits, styling, small optimizations).
   - Provide concrete replacement code snippets and line citations.

---

## Review Team Specializations

### 1. Senior Software Engineer Subagent

- **Focus**: Correctness, logic integrity, algorithmic efficiency, error handling, edge cases, test quality.
- **Key Inspection Points**:
  - Does the implementation fulfill the feature intent without side effects or regressions?
  - Are boundary conditions, null/undefined safety, empty arrays, and off-by-one errors handled?
  - Are asynchronous operations, Signals, and reactive flows properly synchronized?
  - Are unit tests behavior-driven, high-value, and covering critical edge cases?
  - Are error states handled gracefully with appropriate user feedback?

### 2. Software Architect Subagent

- **Focus**: System architecture, component structure, clean boundaries, design patterns, project standards.
- **Key Inspection Points**:
  - Does the code strictly adhere to Vertical Slice Architecture (feature self-containment)?
  - Are domain boundaries, shared services, and dependencies cleanly separated?
  - Does the implementation comply with `docs/code_style.md` and `docs/schema.md`?
  - Are there unnecessary dependencies, tight couplings, or circular dependencies?
  - Are naming conventions, file organizations, and modern Angular patterns consistent across the slice?
  - Does any UI follow `docs/design_system.md`: shared components before raw Material, theme and token layer only, one `app-page-header` per routed page? Did `scripts/ui-baseline.json` only shrink, and is any change to `scripts/check-ui.mjs` a tightening?

### 3. Cybersecurity Expert Subagent

- **Focus**: Application security, threat modeling, data privacy, injection prevention, secure storage, and `docs/security.md` compliance.
- **Key Inspection Points**:
  - Does the implementation comply with `docs/security.md` (preserving local data, no real personal data in commits/fixtures, safe rendering, no secrets)?
  - Are inputs validated and sanitized against XSS, injection, or unexpected payloads?
  - Is sensitive user data properly protected in IndexedDB/Dexie without accidental leakage?
  - Are there risks of prototype pollution, insecure deserialization, or improper error disclosure?
  - Are new third-party packages scrutinized for supply chain / vulnerability concerns?
  - Are client-side state transitions secure against tampering or invalid state bypass?

---

## Execution Workflow

### Step 1: Diff & Context Acquisition

1. Retrieve the pull request diff or branch changes:
   ```bash
   # If reviewing an existing GitHub PR
   gh pr diff <PR_NUMBER>
   gh pr view <PR_NUMBER>

   # Or if reviewing the local working branch against main
   git diff main...HEAD
   ```
2. Gather project context:
   - Changed files list.
   - Project rules: `AGENTS.md`, `docs/code_style.md`, `docs/schema.md`, `docs/design_system.md`, `docs/security.md`.
   - Relevant feature specs in `specs/`.

### Step 2: Parallel Subagent Dispatch

Use the active harness's available subagent tools to dispatch the three reviewer roles above in parallel. Give each reviewer the diff, repository-relative paths, relevant project instructions and specs, and its role's focus. Ask for actionable findings with severity, file/line evidence, and suggested fixes. Reviewers must not edit files or post reviews.

If delegation is unavailable or disallowed in the session, perform three separate passes using the same role definitions, then synthesize them. State that the review was sequential; do not claim independent reviewers ran. Resolve all repository-relative paths from the current checkout root, including in worktrees.

### Step 3: Synthesis & Verification

1. Collect results from all three reviewers, or complete all three sequential passes. Verify findings against the actual code before reporting them.
2. Run automated validation checks:
   ```bash
   npm run lint
   npm test -- --watch=false
   ```
3. Synthesize the findings into a consolidated review artifact:
   - **Executive Summary**: Overall verdict (APPROVE / REQUEST CHANGES / COMMENT) and high-level health score.
   - **Critical Findings (Blockers)**: Issues that must be resolved prior to merge.
   - **Major Findings**: Important architectural, security, or engineering improvements.
   - **Minor Findings & Suggestions**: Code style, nits, and readability tweaks.
   - **Domain Breakdown**: Key highlights from each expert role.
   - **Actionable Code Diffs**: Concrete, drop-in replacement suggestions.

### Step 4: Review Delivery

- Present the structured report to the user. Post to GitHub only when the user explicitly requests it, using the available GitHub integration or `gh pr review`.
