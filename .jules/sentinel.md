# Sentinel's Journal - Critical Learnings

This journal is NOT a log - only add entries for CRITICAL security learnings.

## 2024-07-23 - Add Security Headers for Defense-in-Depth
**Vulnerability:** The application was missing common security headers (`X-Content-Type-Options`, `X-Frame-Options`) in its Vercel configuration. This could expose users to MIME-sniffing and clickjacking attacks, where the browser might incorrectly interpret content types or an attacker could embed the site in a malicious iframe.
**Learning:** Even when the application logic itself is secure, the deployment configuration can introduce vulnerabilities. Security headers are a crucial layer of defense (defense-in-depth) that instruct the browser to enforce stricter security policies, mitigating entire classes of vulnerabilities.
**Prevention:** Always review deployment configurations (`vercel.json`, `netlify.toml`, etc.) for missing security headers. Establish a baseline security configuration for all new projects that includes standard headers like `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, and `Strict-Transport-Security`.
