# Sentinel's Journal - Critical Learnings

This journal is NOT a log - only add entries for CRITICAL security learnings.

## 2024-07-26 - Missing Sanitization of External API Data
**Vulnerability:** In `src/components/SearchForm.tsx`, data fetched from the GitHub API (organization names) was rendered in the UI without being passed through the application's `sanitize` function. This created a potential XSS vulnerability if a user was part of a GitHub organization with a maliciously crafted name.
**Learning:** The "defense in depth" principle requires that we do not implicitly trust data from any external source, even a reputable one like the GitHub API. While modern frameworks like React provide some default protection against XSS, failing to sanitize data at the point it enters the application is a critical oversight.
**Prevention:** Always sanitize data received from external APIs before it is stored or rendered. A reusable sanitization utility, like the one in `src/services/sanitizer.ts`, should be applied consistently to all incoming data that will be reflected in the UI.

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

## 2025-02-18 - Exposed Access Token in Session Cookie
**Vulnerability:** The GitHub access token was stored in a standard signed JWT (JWS) within the `session` cookie. Although the cookie was marked `HttpOnly` and `Secure`, the token itself was merely Base64-encoded within the JWT payload. Anyone with access to the cookie string (e.g., via browser DevTools, network sniffing, or accidental log leakage) could trivially decode the JWT and extract the sensitive access token.
**Learning:** `HttpOnly` protects against XSS reading cookies, but it does not provide confidentiality for the cookie's contents. Storing sensitive credentials (like third-party access tokens) in plaintext or signed-only formats exposes them to leakage. Encryption is required when the payload contains secrets.
**Prevention:** Use JWE (JSON Web Encryption) instead of JWS (JSON Web Signature) when the JWT payload contains sensitive data. Additionally, ensure the encryption key is of the correct length and strength by deriving it (e.g., using SHA-256) from the session secret, rather than using the raw secret string which may not meet algorithm requirements.
