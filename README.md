# PocketDiscipline

## CI and deployment

- `.github/workflows/ci.yml` validates pull requests targeting `main`. New commits cancel superseded runs for that PR.
- `.github/workflows/deploy.yml` validates pushes to `main` and manual runs on `main`, then deploys to GitHub Pages. Production runs are serialized without cancelling an active deployment.
- `.github/workflows/validate.yml` is the shared reusable workflow. It runs two parallel jobs (`Validation / Lint, test and build` and `Validation / Smoke tests`), building with `/PocketDiscipline/` as the base href and smoke-testing under that deployment path. On `main`, the build job uploads the Pages artifact and deployment publishes it only after both validation jobs succeed.

Each runner job has a 15-minute timeout. Run `npm run e2e:smoke` locally to check the production build under the deployment path; `npm run e2e` runs the full suite against the development server.
