# Implementation Plan: Rewards & Money Withdrawal System

**Branch**: `008-rewards-withdrawal` | **Date**: 2026-09-05 | **Spec**: [specs/008-rewards-withdrawal/spec.md](file:///c:/Projects/MyProjects/PocketDiscipline/specs/008-rewards-withdrawal/spec.md)

**Input**: Feature specification from `specs/008-rewards-withdrawal/spec.md`

## Summary

Implement a comprehensive Rewards and Balance Withdrawal system that allows users to redeem their earned discipline balance for real-world rewards and track personal spending. The feature provides:
1. Quick Spend ad-hoc withdrawals directly from the Dashboard balance widget and Rewards hub.
2. Reward Store & Wishlist with visual savings progress indicators, repeatable treat vs. one-time milestone distinction, and instant claiming.
3. Dedicated Rewards Hub with Store, History / Ledger (searchable, filterable, with balance-refunding reverts), and Spending Analytics (native SVG category donut and timeline trend charts).
4. Category Management in Settings with a permanently protected `"General"` fallback.
5. Atomic multi-table Dexie transactions guaranteeing data integrity and zero negative balances.

## Technical Context

**Language/Version**: TypeScript ~6.0, Angular v22 (standalone components, signals, RxJS)

**Primary Dependencies**: Angular Material (`@angular/material`), Angular CDK (`@angular/cdk`), Dexie.js (`dexie`)

**Storage**: Dexie.js (IndexedDB) - `pocket-discipline-db` (`version(8)` adding `withdrawals`, `rewards`, and `rewardCategories` tables)

**Testing**: Vitest (`npm test`), Playwright (`npm run e2e`)

**Target Platform**: Modern Web Browsers / PWA (offline-capable)

**Project Type**: Web Application (Angular Vertical Slice Architecture)

**Performance Goals**: Dashboard quick spend executes under 15 seconds; tab navigation and chart rendering update in <500ms

**Constraints**: Offline-first, no external backend, zero external charting libraries (native SVG only), atomic database integrity

**Scale/Scope**: Single local user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Does the implementation use a Vertical Slice Architecture? *(Feature is completely encapsulated under `src/app/features/rewards/` with minimal integration touchpoints in Dashboard, Settings, and Layout).*
- [x] Have we minimized external dependencies (i.e., are all new packages strictly necessary)? *(Zero new npm packages installed; native SVG used for donut and trend charts).*
- [x] Will the new code comply with ESLint, EditorConfig, and Prettier configurations? *(Standard mandatory `npm run lint` verification).*
- [x] Does the design adhere to SOLID principles and established developer best practices? *(Services strictly separate concerns: `WithdrawalService`, `RewardsService`, `CategoryService`, `SpendingAnalyticsService`).*

## Project Structure

### Documentation (this feature)

```text
specs/008-rewards-withdrawal/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── ui-and-service-contracts.md
└── checklists/
    └── requirements.md  # Spec quality validation checklist
```

### Source Code (repository root)

```text
src/
└── app/
    ├── core/
    │   └── services/
    │       └── db.service.ts                               # Bump to version(8) with withdrawals, rewards, rewardCategories
    ├── shared/
    │   └── components/
    │       └── layout/
    │           └── layout.ts                               # Add /rewards route to NAV_ITEMS
    ├── app.routes.ts                                       # Register lazy-loaded /rewards route
    └── features/
        ├── dashboard/
        │   └── components/
        │       └── balance-widget/                         # Add Quick Spend trigger button and dialog opener
        ├── settings/
        │   ├── settings.html                               # Embed CategoryManagementComponent
        │   └── settings.ts
        └── rewards/
            ├── models/
            │   ├── withdrawal.model.ts                     # WithdrawalRecord interface and DTOs
            │   ├── reward.model.ts                         # RewardItem interface and types
            │   ├── reward-category.model.ts                # RewardCategory interface and initial categories
            │   └── spending-analytics.model.ts             # SpendingAnalyticsSummary and chart interfaces
            ├── services/
            │   ├── withdrawal.service.ts                   # Atomic balance withdrawals, reverts, and queries
            │   ├── withdrawal.service.spec.ts              # Unit tests for withdrawals and reversions
            │   ├── rewards.service.ts                      # Rewards CRUD, claiming, progress calculations
            │   ├── rewards.service.spec.ts                 # Unit tests for reward claiming and progress
            │   ├── category.service.ts                     # Category CRUD, safeguards, reassignment
            │   ├── category.service.spec.ts                # Unit tests for category deletion & reassignment
            │   ├── spending-analytics.service.ts           # Category and timeframe expenditure aggregation
            │   └── spending-analytics.service.spec.ts      # Unit tests for analytics calculations
            ├── components/
            │   ├── category-management/                    # Category list, add/edit/delete with protected fallback
            │   ├── quick-spend-dialog/                     # Quick spend modal (used on Dashboard & Rewards)
            │   ├── reward-card/                            # Individual reward card with progress bar
            │   ├── reward-form-dialog/                     # Dialog for adding/editing rewards
            │   ├── reward-store/                           # Store / Wishlist grid, filters, and claim triggers
            │   ├── withdrawal-ledger/                      # History / Ledger table/list with search, filter, revert
            │   ├── spending-donut-chart/                   # Native SVG Donut / Pie chart with category legend
            │   ├── spending-trend-chart/                   # Native SVG timeline bar chart (daily/monthly)
            │   └── spending-analytics/                     # Analytics tab composing metric cards & SVG charts
            ├── pages/
            │   └── rewards-hub/                            # Main container page with tabs (Store, Ledger, Analytics)
            └── rewards.routes.ts                           # Child routing for rewards hub
```

**Structure Decision**: Vertical Slice Architecture under `src/app/features/rewards/` isolating all reward-specific state, models, and UI. Shared integration points are limited to triggering `QuickSpendDialogComponent` from the dashboard balance widget and exposing category management in settings.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *None* | *Fully compliant with Constitution and Project Rules* | *N/A* |
