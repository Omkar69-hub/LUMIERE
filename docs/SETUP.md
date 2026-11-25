# Local installation — LUMIÈRE

## 1. Prerequisites
- Git, Node.js 22.12+ (22 LTS), npm bundled with Node, Docker Desktop with Compose v2 (or PostgreSQL 16).
- Ports 5173 (frontend), 3001 (API), 5432 (database) available locally. Do not expose them to the internet.
- Windows: use PowerShell, start Docker Desktop, and ensure `docker compose version`, `node -v`, `npm -v`, `git --version` succeed.

## 2. Clone and configure (PowerShell)
```powershell
git clone --branch development https://github.com/Omkar69-hub/LUMIERE.git
cd LUMIERE
$env:POSTGRES_PASSWORD = node -e "console.log(require('node:crypto').randomBytes(24).toString('hex'))"
docker compose up -d
docker compose ps
Copy-Item backend/.env.example backend/.env
notepad backend/.env
```
Replace REPLACE_ME in DATABASE_URL with the generated local password (inspect it in your private shell with `$env:POSTGRES_PASSWORD`). Keep APP_ORIGIN=http://localhost:5173, PORT=3001, HOST=127.0.0.1 and NODE_ENV=development. Leave optional service credentials blank. Store the local password securely; when restarting Compose, set the same password, not a new one. A persisted PostgreSQL volume retains its original credentials.

macOS/Linux: use `export POSTGRES_PASSWORD="$(node -e 'console.log(require("node:crypto").randomBytes(24).toString("hex"))')"`, `cp backend/.env.example backend/.env`, and your local text editor. If using existing PostgreSQL, create a dedicated database and user, adjust DATABASE_URL, and skip Compose. URL-encode special characters in passwords.

## 3. Install, generate and migrate
From repository root:
```sh
npm install
npm run build
npm run db:migrate
npm run dev
```
Open http://localhost:5173 (not a different host/IP). The frontend proxies /api to the loopback API. Check http://127.0.0.1:3001/api/health. Stop development servers with Ctrl+C. Do not use `docker compose down -v` or `prisma migrate reset` on any database containing useful records.

For a local production-build preview (not a deployment), stop dev servers, run npm run build, then in two terminals run npm run start -w backend and npm run preview -w frontend -- --host localhost --port 5173 --strictPort. Use the same APP_ORIGIN. 

## 4. Create an administrator
After generating Prisma client and migrating, set ADMIN_EMAIL, ADMIN_NAME, ADMIN_MOBILE and ADMIN_PASSWORD in a private shell (minimum 16 characters; synthetic account only). Run:
```sh
npm run admin:create -w backend
```
Clear those environment variables immediately. No default password, no public admin signup, no automatic promotion. Sign in through /login and open /admin. Create a brand and category, create a product draft with variant and approved HTTPS image/alt text, then publish. The storefront is intentionally empty until actual products are added. Use original or licensed photography.

## 5. Optional integrations
Use test keys only. Configure RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET in backend/.env (never commit actual secrets). Enable automatic capture in the Razorpay test dashboard. Configure payment.captured webhook at an approved HTTPS test endpoint /api/payments/webhook. No live keys, no production deployment. Verify an email address and create a test product/address to exercise checkout. Test shipping is zero. If setup enters REVIEW/CREATING or an unpaid provider order remains open, stock remains reserved; reconciliation is mandatory before release. The automated suite injects an isolated test gateway, not a real transaction. Production CSP, capture/reconciliation, refunds, taxes, shipping and security review are pending.
### Email
Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and SMTP_FROM in backend/.env using an approved test mail account. Without SMTP, signup/login still work but actual verification/recovery delivery does not; checkout requires verified email. Never use real customer information in development.
### Administrator MFA
Production admin APIs always require enrolled TOTP and session verification; development can opt in for all administrators with ADMIN_MFA_REQUIRED=true. An enrolled administrator always requires MFA. Set ADMIN_MFA_ENCRYPTION_KEY to a securely stored 32-byte hex key; generate a unique random Base32 secret (at least 160 bits) in a secure authenticator provisioning tool, import it into the authenticator, set ADMIN_EMAIL and ADMIN_TOTP_BASE32 locally, and run npm run admin:mfa -w backend after building/migrating. Never commit or share secret values. Enrollment/rotation revokes sessions. Sign in, open /admin, then enter current authenticator code. No public enrollment or recovery bypass. Keep encryption key backed up securely; operator re-enrollment is the recovery mechanism. External operational enrollment and production review pending.
### Cloud media
Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in backend/.env. Server-side signed image upload only (JPEG/PNG/WebP, max 5 MiB, protected administrator API). Files are sent to Cloudinary, not stored in PostgreSQL. Use licensed assets only; provider account and upload quota must be approved. Set a provider-side image pixel/dimension limit and moderation policy before production. Failed or unsaved uploads may require manual asset cleanup in the provider console. No cloud upload executed in CI.

## 6. Isolated automated tests (PowerShell)
Stop all app servers first. Create a distinct test database in the local PostgreSQL container, not the app database.
```powershell
docker compose exec postgres createdb -U lumiere lumiere_test
$env:DATABASE_URL = "postgresql://lumiere:$($env:POSTGRES_PASSWORD)@localhost:5432/lumiere_test"
$env:TEST_DATABASE_URL = $env:DATABASE_URL
$env:APP_ORIGIN = "http://localhost:5173"
$env:PORT = "3001"
$env:NODE_ENV = "development"
npm run build
npm run db:migrate
npm test
npx playwright install chromium
npm run test:browser
npm audit --audit-level=high
```
Ensure optional SMTP, Razorpay and media settings are blank in the test environment (including backend/.env). Tests use isolated fixtures and a test gateway. Browser screenshots and traces are stored under test-results/. On Linux, install Chromium dependencies with npx playwright install --with-deps chromium. Browser tests launch the API and built preview automatically. Clear DATABASE_URL and TEST_DATABASE_URL after tests before restarting the normal app; shell variables override backend/.env. Never point tests at a real database.

## 7. Troubleshooting
- Docker not running: start Docker Desktop and check docker compose ps/logs.
- Database authentication: match DATABASE_URL to the existing database password; changing Compose environment does not change an initialized database's password.
- Prisma client missing: npm run build before starting.
- Port in use: stop the conflicting local process. Do not change ports without adjusting proxy and APP_ORIGIN.
- 403 untrusted origin: open the precise localhost:5173 URL; don't use 127.0.0.1 for the frontend.
- Account recovery unavailable: configure approved SMTP; no simulated delivery.
- Payments unavailable: test credentials absent; never use live keys.
- Empty shop: publish products in admin. Media upload unavailable until configured.
- MFA blocked: enroll locally with encryption key, do not bypass production authorization.

## 8. Release gates
No production deployment. See QA.md for current limitations, required provider verification, policy approval, real photography and final production security/operational review. Development robots.txt and metadata block indexing deliberately; do not remove until approved launch.
