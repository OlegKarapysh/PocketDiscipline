# Data Model

*Note: This feature focuses on testing infrastructure (CI, E2E, Unit Tests). There are no new application database entities or business models introduced.*

## System Entities (Testing Context)

- **Test Suite (Unit)**: Composed of `*.spec.ts` files running via Vitest. Validates individual components and services.
- **Test Suite (E2E)**: Composed of `*.spec.ts` files in the `e2e` directory running via Playwright. Validates user journeys against a running instance of the application.
- **CI Pipeline**: A GitHub Actions workflow (`ci.yml`) that defines the steps to checkout code, install dependencies, run unit tests, and run E2E tests on every pull request.
