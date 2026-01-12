# Sentinel's Journal - Critical Learnings

This journal is NOT a log - only add entries for CRITICAL security learnings.

## 2024-07-25 - Unenforced JWT Verification in OAuth Callback
**Vulnerability:** The `jwtVerify` function from the `jose` library was called in `api/auth/callback.ts` to validate the OAuth state token, but it was never imported. This caused the JWT verification to fail silently, completely bypassing CSRF protection and allowing for potential tampering of the `mode` parameter, leading to privilege escalation.
**Learning:** The project's build or linting process did not catch the use of an un-imported function, allowing a critical security control to be silently disabled. This highlights a gap in the automated checks that should prevent such code from being deployed.
**Prevention:** Implement stricter static analysis and type-checking in the CI/CD pipeline. Specifically, ensure that using an un-imported function results in a build failure. Code reviewers must also meticulously check that all imports correspond to their usage.

## 2024-07-26 - Weak CSRF Token Generation
**Vulnerability:** The CSRF `state` token in the OAuth flow was generated using `crypto.randomUUID()`. The cryptographic security of this function is not guaranteed across all JavaScript environments, which could lead to the generation of predictable tokens and weaken the protection against CSRF attacks.
**Learning:** For security-critical values such as CSRF tokens, it is essential to use a source of randomness that is explicitly designed for cryptographic purposes. General-purpose UUID generators are not a suitable substitute. The Web Crypto API's `crypto.getRandomValues` is the standard, secure method for this in modern web environments.
**Prevention:** Mandate the use of a cryptographically secure pseudo-random number generator (CSPRNG) like `crypto.getRandomValues` for all security-sensitive token generation. This should be a documented coding standard, and code reviews should flag the use of weaker random sources like `Math.random()` or `crypto.randomUUID()` in security contexts.
