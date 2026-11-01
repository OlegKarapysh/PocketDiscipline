# PocketDiscipline

## CI and deployment

- `.github/workflows/ci.yml` validates pull requests targeting `main`. New commits cancel superseded runs for that PR.
- `.github/workflows/deploy.yml` validates pushes to `main` and manual runs on `main`, then deploys to GitHub Pages. Production runs are serialized without cancelling an active deployment.
- `.github/workflows/validate.yml` is the shared reusable workflow. It lints, typechecks, runs unit tests, and builds once with `/PocketDiscipline/` as the base href. Smoke tests download and extract the Pages artifact; deployment publishes that same artifact only after validation succeeds.

Each runner job has a 15-minute timeout. Run `npm run e2e:smoke` locally to check the production build under the deployment path; `npm run e2e` runs the full suite against the development server.

The workflow split changes PR check names. If branch protection requires the old `test` or `e2e-smoke` checks, update it to require the new validation checks after the first PR run.
