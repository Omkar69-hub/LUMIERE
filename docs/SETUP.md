# Local development

Requirements: Node.js 22, npm, Docker Compose (or PostgreSQL 16).

1. Set POSTGRES_PASSWORD in your shell to a strong local password, then run docker compose up -d.
2. Copy backend/.env.example to backend/.env. Set DATABASE_URL to match the database credentials (URL-encode special characters). Never commit this file.
3. Run npm install at the root.
4. Run npm run db:migrate, then npm run dev.
5. Open http://localhost:5173. Use only synthetic test accounts.
6. Run npm run build to check both packages.

For tests, provision a separate PostgreSQL database, set both DATABASE_URL and TEST_DATABASE_URL to its URL, apply migrations, then run npm test. The tests inject a test-only email collector, not real delivery. Set SMTP credentials in backend/.env for real email. Production needs an HTTPS same-origin reverse proxy and additional security verification. No deployment is configured.

## Razorpay sandbox
Use test keys only. Configure RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET in backend/.env (never commit actual secrets). Enable automatic capture in the Razorpay test dashboard. Configure payment.captured webhook at an approved HTTPS test endpoint /api/payments/webhook. No live keys, no production deployment. Verify an email address and create a test product/address to exercise checkout. Test shipping is zero. If setup enters REVIEW/CREATING or an unpaid provider order remains open, stock remains reserved; reconciliation is mandatory before release. The automated suite injects an isolated test gateway, not a real transaction. Production CSP, capture/reconciliation, refunds, taxes, shipping and security review are pending.
