## IGNORE: Committing Binary Files

**- Pattern:** Committing the `mise` binary or other executables.
**- Justification:** Binaries bloat the repository and are platform-specific. Observed in PR #228.
**- Files Affected:** `mise`, `*/mise`, other binaries.

## IGNORE: Out-of-Scope Changes

**- Pattern:** Modifying files unrelated to the agent's specific persona/mission (e.g., Janitor modifying CI config, Arrumador modifying source code).
**- Justification:** Agents must strictly adhere to their scope. Mixing concerns increases rejection risk. Observed in PRs #210 and #221.
**- Files Affected:** `src/**/*`, `.github/**/*`, `mise.toml`, `.jules/*.md`.
