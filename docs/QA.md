# Quality assurance and release gates

Baseline run 45611171388 passed builds, migrations, API suites, desktop/mobile browser suites and dependency audit. New QA commits require their own green run; use Actions as source of truth.

## Automated coverage
- Registration, duplicate prevention, login/logout, protected routes, profile persistence, password recovery and verification through test mailer, session revocation, authorization and CSRF.
- Catalog, stock, cart/wishlist ownership, order reservation, captured-payment verification and refunds with injected test gateway, coupon and return transitions, admin MFA and audit, customer support.
- Chromium desktop/mobile UI: account journeys, public navigation, reduced motion, filters, metadata, horizontal overflow, keyboard focus, admin product publication, shopping and support. Newly added browser tests are unverified until CI finishes.
- CI uploads synthetic screenshots and failure traces. No live customer records or credentials in evidence.

## Manual verification before any release
- Review actual screenshots at 320, 390, 768, 1024 and 1440 px; keyboard-only, screen-reader and contrast checks; Safari/Firefox; zoom to 200%; motion preference.
- Measure LCP, CLS and INP with real approved images and realistic catalog sizes; check slow-network and error states. No performance score claimed without measurement.
- Validate real SMTP in sandbox, test Razorpay payment/refund and webhook delivery, actual Cloudinary upload and dimension/moderation policy.
- Verify HTTPS production cookies/CSP, trusted reverse proxy settings, rate limits across instances, backups and restore, secret rotation, admin MFA enrollment and recovery, security review.
- Finalize merchant identity, privacy/data retention/rights, consent withdrawal, commercial tax/shipping/returns policies, support operations and licensed product assets.
- Reproducible dependency lockfile, deployment configuration and indexing approval required before release. No deployment authorized.
