---
name: "pr-review"
description: "Conduct an expert-level, multi-perspective pull request review by orchestrating three parallel subagents (Senior Software Engineer, Software Architect, Cybersecurity Expert) and synthesizing their findings into an actionable report."
---

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
   - Enforce [`docs/code_style.md`](file:///c:/Projects/MyProjects/PocketDiscipline/docs/code_style.md) (naming conventions, no magic numbers, explicit types).
   - Enforce [`docs/schema.md`](file:///c:/Projects/MyProjects/PocketDiscipline/docs/schema.md) for data persistence and Dexie operations.
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
  - Does the implementation comply with [`docs/code_style.md`](file:///c:/Projects/MyProjects/PocketDiscipline/docs/code_style.md) and [`docs/schema.md`](file:///c:/Projects/MyProjects/PocketDiscipline/docs/schema.md)?
  - Are there unnecessary dependencies, tight couplings, or circular dependencies?
  - Are naming conventions, file organizations, and modern Angular patterns consistent across the slice?

### 3. Cybersecurity Expert Subagent
- **Focus**: Application security, threat modeling, data privacy, injection prevention, secure storage.
- **Key Inspection Points**:
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
   - Project rules: `GEMINI.md`, `docs/code_style.md`, `docs/schema.md`.
   - Relevant feature specs in `specs/`.

### Step 2: Parallel Subagent Dispatch
Invoke the 3 review subagents concurrently using a single `invoke_subagent` tool call:

```typescript
// Subagents invocation payload
{
  Subagents: [
    {
      TypeName: "research",
      Role: "Senior Software Engineer Reviewer",
      Prompt: `Perform a deep code correctness and engineering review of the following pull request / changes:\n[DIFF & CONTEXT]\n\nFocus on: logic bugs, edge cases, error handling, performance, signal reactivity, typesafety, and unit test coverage. Categorize findings into Critical, Major, and Minor with file/line references and concrete code recommendations.`
    },
    {
      TypeName: "research",
      Role: "Software Architect Reviewer",
      Prompt: `Perform an architectural and code style review of the following pull request / changes:\n[DIFF & CONTEXT]\n\nFocus on: Vertical slice architecture, modularity, separation of concerns, docs/code_style.md compliance (no magic values, naming), docs/schema.md compliance, and Angular v22 best practices. Categorize findings into Critical, Major, and Minor with file/line references.`
    },
    {
      TypeName: "research",
      Role: "Cybersecurity Expert Reviewer",
      Prompt: `Perform a cybersecurity and threat analysis of the following pull request / changes:\n[DIFF & CONTEXT]\n\nFocus on: OWASP vulnerabilities, XSS, injection vectors, input validation, client-side data security in Dexie/IndexedDB, sensitive data leakage, and dependency risks. Categorize findings into Critical, Major, and Minor with file/line references and mitigation advice.`
    }
  ]
}
```

### Step 3: Synthesis & Verification
1. Await results from all 3 subagents (system resumes reactively upon completion).
2. Run automated validation checks:
   ```bash
   npm run lint
   npm test
   ```
3. Synthesize the findings into a consolidated review artifact:
   - **Executive Summary**: Overall verdict (APPROVE / REQUEST CHANGES / COMMENT) and high-level health score.
   - **Critical Findings (Blockers)**: Issues that must be resolved prior to merge.
   - **Major Findings**: Important architectural, security, or engineering improvements.
   - **Minor Findings & Suggestions**: Code style, nits, and readability tweaks.
   - **Domain Breakdown**: Key highlights from each expert role.
   - **Actionable Code Diffs**: Concrete, drop-in replacement suggestions.

### Step 4: Review Delivery
- Present the structured report to the user or post directly to GitHub using `gh pr review <PR_NUMBER> --comment` / `--request-changes` / `--approve`.
