## IGNORE: Mixed Scope / Persona Violation

**- Pattern:** Agents modifying files outside their defined scope (e.g., Janitor touching CI/Tooling, Arrumador touching Application Logic) or mixing unrelated fixes (e.g., UI bug fixes in a Refactor PR).
**- Justification:** Violates Single Responsibility Principle, complicates code review, increases risk of regressions, and leads to PR rejection due to lack of focus.
**- Files Affected:** Cross-domain modifications (e.g. `src/` vs `.github/`, `mise.toml`).

## IGNORE: Committing Binaries

**- Pattern:** Committing executable binaries (e.g., `mise`) or build artifacts to the repository.
**- Justification:** Causes repository bloat and introduces security risks; binaries should be ignored via `.gitignore` or installed dynamically.
**- Files Affected:** `mise`, `dist/`, binary files.

## IGNORE: Unrelated Lockfile Churn

**- Pattern:** Massive `package-lock.json` diffs (thousands of lines) without corresponding `package.json` changes, often due to platform-specific optional dependencies or environment differences.
**- Justification:** Creates noise in PRs, obscures actual dependency updates, and can cause CI instability if dependencies are incorrectly platform-locked.
**- Files Affected:** `package-lock.json`.

## IGNORE: Release Steps in Vercel Projects

**- Pattern:** Adding `gh release create` or artifact upload steps to `.github/workflows/autorelease.yml` when the project is deployed on Vercel.
**- Justification:** Vercel manages deployments automatically; manual release steps in CI are redundant or conflict with the platform's workflow.
**- Files Affected:** `.github/workflows/autorelease.yml`.

## IGNORE: Unrelated Trivial Changes

**- Pattern:** Including unrelated formatting tweaks (e.g., whitespace, ternary operator formatting) or minor logic adjustments in a PR focused on a different task (e.g., Refactoring).
**- Justification:** Creates noise, distracts reviewers, and violates the Single Responsibility Principle.
**- Files Affected:** Any source file (e.g., `src/pages/HomePage.tsx`).

## IGNORE: Redundant CI Build Steps

**- Pattern:** Adding explicit `build` steps to the `ci` task or GitHub Actions workflow when the project is deployed on Vercel.
**- Justification:** Vercel handles the build process. Adding it to CI increases pipeline duration and may fail due to environment differences (e.g., missing API keys).
**- Files Affected:** `mise.toml`, `.github/workflows/*.yml`.
