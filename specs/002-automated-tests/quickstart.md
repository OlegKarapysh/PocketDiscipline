# Validation Quickstart: Automated Tests

This guide provides instructions to validate that the new testing infrastructure works as expected.

## Prerequisites
- Node.js installed
- Project dependencies installed (`npm install`)

## 1. Validating Unit Tests
Ensure the unit test suite runs successfully via Vitest.

```bash
npm run test
```
**Expected Outcome**: The command should execute all `*.spec.ts` files and exit with a `0` status code, displaying a summary of passing tests.

## 2. Validating E2E Tests
Ensure the Playwright E2E tests run successfully against the application.

```bash
# Terminal 1: Start the application
npm start

# Terminal 2: Run Playwright tests
npx playwright test
```
**Expected Outcome**: Playwright should execute the tests in the `e2e` directory and report success. If running locally, you can also use `npx playwright show-report` to view the HTML report.

## 3. Validating CI Pipeline
To validate the GitHub Actions CI pipeline:

1. Create a new branch and make a small commit.
2. Push the branch to the remote repository.
3. Open a Pull Request on GitHub.
4. Navigate to the "Actions" tab or look at the PR checks.

**Expected Outcome**: The `ci.yml` workflow should trigger automatically. It should install dependencies, run `npm run test`, run Playwright tests, and ultimately report a green checkmark indicating all tests passed.
