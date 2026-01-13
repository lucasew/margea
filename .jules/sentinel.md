# Sentinel's Journal - Critical Learnings

This journal is NOT a log - only add entries for CRITICAL security learnings.

## 2024-07-25 - Unenforced JWT Verification in OAuth Callback
**Vulnerability:** The `jwtVerify` function from the `jose` library was called in `api/auth/callback.ts` to validate the OAuth state token, but it was never imported. This caused the JWT verification to fail silently, completely bypassing CSRF protection and allowing for potential tampering of the `mode` parameter, leading to privilege escalation.
**Learning:** The project's build or linting process did not catch the use of an un-imported function, allowing a critical security control to be silently disabled. This highlights a gap in the automated checks that should prevent such code from being deployed.
**Prevention:** Implement stricter static analysis and type-checking in the CI/CD pipeline. Specifically, ensure that using an un-imported function results in a build failure. Code reviewers must also meticulously check that all imports correspond to their usage.

## 2026-01-11 - Secure Secret Generation in Documentation
**Vulnerability:** The project's README files recommended using `openssl rand -base64 32` to generate the `SESSION_SECRET`. While this creates a cryptographically secure value, the Base64 character set includes symbols (`+`, `/`, `=`) that can be misinterpreted by shell environments or URL parsers, leading to a corrupted or weakened secret.
**Learning:** Documentation is a critical part of security. An insecure recommendation, even if the code itself is secure, can introduce vulnerabilities during the setup and deployment phases. The principle of 'secure by default' should extend to all developer-facing instructions.
**Prevention:** Always recommend cryptographic key generation methods that produce URL-safe and shell-safe character sets, such as hexadecimal encoding (`openssl rand -hex 32`), to prevent parsing errors and ensure the full entropy of the secret is preserved.
