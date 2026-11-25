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

## Cart and wishlist
All routes require a valid customer session. PUT /api/cart/items sets an absolute quantity (1–20) by variant, not an increment. GET /api/cart returns authoritative current INR prices and available-item subtotal. PATCH /api/cart/items/:id sets quantity; DELETE removes an owned item. GET /api/wishlist lists published saved products; PUT and DELETE /api/wishlist/items/:productId save/remove idempotently. Cart and wishlist persist by user; no stock reservation, checkout, shipping or payment is implied. Guest carts not implemented in this milestone.

## Checkout and orders (test mode)
GET /api/orders/configuration; GET /api/orders?page=1; GET /api/orders/:id; POST /api/orders {addressId,requestKey,expectedTotalPaise}; POST /api/orders/:id/cancel (only before gateway setup); POST /api/orders/:id/payment; POST /api/orders/:id/verify {paymentId,signature}. Orders use immutable address/price snapshots and reserve inventory transactionally. POST /api/payments/webhook validates raw-body HMAC independently of browser Origin, confirms captured payment via provider fetch, and deduplicates event IDs. Verified email required to create or initialize checkout. Test-only zero shipping; no coupons or tax policy implemented. Pending gateway orders need manual reconciliation before stock release; never release while a payment may still be captured.
