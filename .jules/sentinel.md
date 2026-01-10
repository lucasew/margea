# Sentinel's Journal - Critical Learnings

This journal is NOT a log - only add entries for CRITICAL security learnings.

## 2024-07-25 - Unenforced JWT Verification in OAuth Callback
**Vulnerability:** The `jwtVerify` function from the `jose` library was called in `api/auth/callback.ts` to validate the OAuth state token, but it was never imported. This caused the JWT verification to fail silently, completely bypassing CSRF protection and allowing for potential tampering of the `mode` parameter, leading to privilege escalation.
**Learning:** The project's build or linting process did not catch the use of an un-imported function, allowing a critical security control to be silently disabled. This highlights a gap in the automated checks that should prevent such code from being deployed.
**Prevention:** Implement stricter static analysis and type-checking in the CI/CD pipeline. Specifically, ensure that using an un-imported function results in a build failure. Code reviewers must also meticulously check that all imports correspond to their usage.
