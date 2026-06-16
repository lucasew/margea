## IGNORE: Mixed Scope / Persona Violation

**- Pattern:** Agents modifying files outside their defined scope (e.g., Janitor touching CI/Tooling, Arrumador touching Application Logic) or mixing unrelated fixes (e.g., UI bug fixes in a Refactor PR).
**- Justification:** Violates Single Responsibility Principle, complicates code review, increases risk of regressions, and leads to PR rejection due to lack of focus. Agents must strictly adhere to their scope.
**- Files Affected:** Cross-domain modifications (e.g. `src/` vs `.github/`, `mise.toml`).

## IGNORE: Unrelated Formatting and Trivial Changes

**- Pattern:** Running global formatting or linting commands (e.g., `npx prettier --write .`) that result in massive diffs in unrelated files (such as `src/locales/*.json` or tests) not involved in the actual fix.
**- Justification:** Introduces severe noise, obscures the PR's true intent, and causes merge conflicts. Agents must bypass global checks and format _only_ the specific files they intentionally modified.
**- Files Affected:** Any file not central to the requested change, commonly `src/locales/*.json` or `tests/*.spec.ts`.

## IGNORE: Committing Binaries

**- Pattern:** Committing executable binaries (e.g., `mise`) or build artifacts to the repository.
**- Justification:** Causes repository bloat and introduces security risks; binaries should be ignored via `.gitignore` or installed dynamically.
**- Files Affected:** `mise`, `*/mise`, `dist/`, other binary files.

## IGNORE: Unrelated Lockfile Churn

**- Pattern:** Massive `package-lock.json` diffs (thousands of lines) without corresponding `package.json` changes, often due to platform-specific optional dependencies or environment differences, or isolated transitive dependency bumps.
**- Justification:** Creates noise in PRs, obscures actual dependency updates, and can cause CI instability if dependencies are incorrectly platform-locked.
**- Files Affected:** `package-lock.json`.

## IGNORE: Release Steps in Vercel Projects

**- Pattern:** Adding `gh release create` or artifact upload steps to `.github/workflows/autorelease.yml` when the project is deployed on Vercel.
**- Justification:** Vercel manages deployments automatically; manual release steps in CI are redundant or conflict with the platform's workflow.
**- Files Affected:** `.github/workflows/autorelease.yml`.
