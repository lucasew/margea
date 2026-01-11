# Consistently Ignored Changes

This file lists patterns of changes that have been consistently rejected by human reviewers. All agents MUST consult this file before proposing a new change. If a planned change matches any pattern described below, it MUST be abandoned.

---

## IGNORE: Adding General Security Headers

**- Pattern:** Do not add broad, general-purpose security headers (e.g., via middleware or global configuration).
**- Justification:** This change has been proposed multiple times by automated agents and consistently rejected. Such changes require careful consideration of the specific application context and potential side effects, and are therefore not suitable for automated pull requests. Any security enhancements should be manually reviewed and implemented by the development team.
**- Files Affected:** Typically affects middleware or server configuration files.

---
