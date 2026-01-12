# Sentinel's Journal - Critical Learnings

This journal is NOT a log - only add entries for CRITICAL security learnings.

## 2024-07-25 - Unenforced JWT Verification in OAuth Callback
**Vulnerability:** The `jwtVerify` function from the `jose` library was called in `api/auth/callback.ts` to validate the OAuth state token, but it was never imported. This caused the JWT verification to fail silently, completely bypassing CSRF protection and allowing for potential tampering of the `mode` parameter, leading to privilege escalation.
**Learning:** The project's build or linting process did not catch the use of an un-imported function, allowing a critical security control to be silently disabled. This highlights a gap in the automated checks that should prevent such code from being deployed.
**Prevention:** Implement stricter static analysis and type-checking in the CI/CD pipeline. Specifically, ensure that using an un-imported function results in a build failure. Code reviewers must also meticulously check that all imports correspond to their usage.

## 2026-01-12 - Harden CSRF Token Generation with Cryptographically Secure Random Numbers
**Vulnerability:** The CSRF token (state parameter) in the OAuth flow was generated using `crypto.randomUUID()`. While providing uniqueness, UUIDs are not guaranteed to be unpredictable or generated from a cryptographically secure pseudo-random number generator (CSPRNG), making them potentially susceptible to prediction attacks.
**Learning:** Security-critical random values, such as CSRF tokens, must be generated using a CSPRNG to ensure they are unpredictable. Relying on general-purpose UUID generators can introduce subtle weaknesses into security mechanisms.
**Prevention:** Always use a function that explicitly sources entropy from the operating system's CSPRNG, such as `crypto.getRandomValues`, for generating secrets, tokens, or other security-sensitive random data. Mandate this in coding standards and check for insecure random number generation during code reviews.
