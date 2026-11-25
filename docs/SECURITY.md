# Security status

Implemented in source (not independently verified): Argon2id; hashed opaque sessions and reset/verification tokens; cookie flags; same-origin mutation check; Helmet; strict input schemas; rate limiting per IP in a single process; database uniqueness; owner-scoped addresses; admin role checks; logout and password-reset session revocation. No OAuth or OTP is simulated.

Before release: run integration and browser tests; review concurrent login/reset and token issuance, distributed rate limiting, account-based throttles and email timing leakage; add token/session cleanup, security logging without secrets, dependency audit, HTTPS reverse proxy, production CSP, backup/restore and external security review. Verification is not required to sign in; future checkout and sensitive flows must define and enforce verification policy. SMTP delivery requires credentials and verification. Terms are a draft. No production readiness claim.

## CI evidence — 25 November 2026
Baseline run 45606858872 succeeded: build, database migration and one auth integration test. npm install reported six high severity dependency vulnerabilities; package identities are not yet known. Added an explicit high-severity audit gate. This is a release blocker. Login session issuance now compares the verified password hash under a user row lock; reset locks the account before token consumption. Expanded test source covers expired sessions and revoked cookie replay. New code awaits CI. Production email, distributed abuse prevention, browser accessibility, full security review remain pending.
