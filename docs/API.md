# API — authentication foundation

Same-origin JSON requests; unsafe methods must include the configured Origin. Session uses an opaque HTTP-only cookie. All authenticated account data is scoped to the server-derived user.

| Method | Route | Access |
|---|---|---|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| POST | /api/auth/logout | Session revocation |
| GET | /api/auth/session | Customer |
| POST | /api/auth/forgot-password | Public; SMTP required |
| POST | /api/auth/reset-password | Single-use token |
| POST | /api/auth/resend-verification | Customer; SMTP required |
| POST | /api/auth/verify-email | Single-use token |
| GET/PATCH | /api/users/me | Customer |
| GET/POST | /api/addresses | Customer |
| PATCH/DELETE | /api/addresses/:id | Address owner |
| GET | /api/admin/access | Admin |

No catalog, cart, checkout, payment or full admin APIs are implemented yet.
