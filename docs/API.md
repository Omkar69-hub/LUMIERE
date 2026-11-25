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

## Catalogue
- GET /api/products: published products, q/category/brand/size/color/minPrice/maxPrice/inStock/sort/page/limit filters. Prices in integer paise.
- GET /api/products/:slug: published detail and variant availability.
- GET /api/categories and /api/brands.
- Admin only: POST /api/admin/catalog/categories, /brands, /products; GET /api/admin/catalog/products; PATCH /api/admin/catalog/products/:id; PATCH /api/admin/catalog/variants/:id/stock.
- Products start unpublished. Publish requires at least one image and variant. Image URLs must be HTTPS; only approved imagery should be entered.
- No cart, checkout, payment or complete admin dashboard yet.
