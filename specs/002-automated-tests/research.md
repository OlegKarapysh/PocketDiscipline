# Research: Automated Tests & CI

## Decision: E2E Framework
- **Decision**: Playwright
- **Rationale**: The specification requested a modern E2E framework. Playwright offers superior speed, auto-waiting capabilities, multi-browser support, and excellent tooling for modern web applications like Angular, often outperforming Cypress in complex scenarios.
- **Alternatives considered**: Cypress was considered, but Playwright was chosen for better performance and headless CI stability. Protractor is deprecated and not viable.

## Decision: CI Provider
- **Decision**: GitHub Actions
- **Rationale**: Recommended and confirmed by the user during the clarification phase. It integrates seamlessly with the GitHub repository, offering straightforward YAML-based configuration for running node scripts and caching dependencies.
- **Alternatives considered**: GitLab CI and Bitbucket Pipelines were evaluated but GitHub Actions was explicitly selected.

## Decision: Unit Testing Framework
- **Decision**: Vitest
- **Rationale**: The `package.json` already includes Vitest and JSDOM. Continuing to use Vitest aligns with the existing setup and provides faster execution times than the traditional Karma/Jasmine setup in Angular.
- **Alternatives considered**: Karma/Jasmine (Angular default) was considered but rejected because Vitest is already installed and is significantly faster.
