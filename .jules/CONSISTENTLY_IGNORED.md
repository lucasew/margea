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
