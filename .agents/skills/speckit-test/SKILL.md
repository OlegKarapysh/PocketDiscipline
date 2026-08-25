---
name: "speckit-test"
description: "Run the project's unit and E2E test suites to verify implementation."
---

## Goal
Execute the project's test suite (`npm run test` and `npm run e2e`) and verify that all tests pass. 
If tests fail, attempt to fix them or report the failure to the user.

## Execution Steps
1. Run `npm run test -- --watch=false` in the project root.
2. Run `npm run e2e` in the project root.
3. If both test suites succeed, output a success message indicating the tests passed.
4. If either test suite fails, analyze the error output and attempt to fix the underlying code. If you cannot fix it, stop and ask the user for guidance.
