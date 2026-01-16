# Sentinel's Journal - Critical Learnings

This journal is NOT a log - only add entries for CRITICAL security learnings.

## 2024-07-25 - Unenforced JWT Verification in OAuth Callback
**Vulnerability:** The `jwtVerify` function from the `jose` library was called in `api/auth/callback.ts` to validate the OAuth state token, but it was never imported. This caused the JWT verification to fail silently, completely bypassing CSRF protection and allowing for potential tampering of the `mode` parameter, leading to privilege escalation.
**Learning:** The project's build or linting process did not catch the use of an un-imported function, allowing a critical security control to be silently disabled. This highlights a gap in the automated checks that should prevent such code from being deployed.
**Prevention:** Implement stricter static analysis and type-checking in the CI/CD pipeline. Specifically, ensure that using an un-imported function results in a build failure. Code reviewers must also meticulously check that all imports correspond to their usage.

## 2024-07-26 - Insecure Secret Generation Command in Documentation
**Vulnerability:** The documentation (`README.md`, `.env.example`, etc.) recommended using `openssl rand -base64 32` to generate the `SESSION_SECRET`. The Base64 character set includes `+`, `/`, and `=`, which are often misinterpreted, stripped, or improperly handled by shell environments and deployment platforms. This can lead to a truncated or weakened secret, significantly reducing the security of the JWTs signed with it.
**Learning:** Security-critical instructions in documentation, especially for secret generation, must be robust and produce outputs that are safe for all target environments. The choice of encoding is not just a matter of format but a critical factor in maintaining security.
**Prevention:** Always recommend hexadecimal encoding (`openssl rand -hex 32`) for generating secrets intended for use in environment variables. This ensures the resulting string is composed of universally safe characters, preventing accidental weakening of the secret.

## 2026-01-16 - Weak CSRF Token Generation
**Vulnerability:** The OAuth flow in `api/auth/github.ts` used `crypto.randomUUID()` to generate the CSRF `state` token. While providing a unique value, the UUID specification does not guarantee that the output is generated from a cryptographically secure pseudo-random number generator (CSPRNG), making it potentially predictable in some environments.
**Learning:** For security-critical values like CSRF tokens, relying on non-security-focused APIs like `crypto.randomUUID()` is a risk. An attacker who could predict the output could bypass the CSRF protection. The principle of defense in depth requires using the most secure primitive available for a given security control.
**Prevention:** Always use a dedicated CSPRNG for generating security tokens. In modern JavaScript environments, `crypto.getRandomValues` is the standard, secure choice for this purpose. Mandate its use for any security-related random value generation in the codebase.
