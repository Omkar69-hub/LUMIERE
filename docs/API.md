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

## Admin console
All /api/admin endpoints require an authenticated server-side ADMIN role. GET /overview?days=30 (test-only paid analytics), /customers?page=1&q=, /customers/:id, /orders?page=1&status=, /orders/:id, /events; PATCH /customers/:id/status {suspended}; PATCH /orders/:id/fulfillment {status,carrier?,trackingNumber?}; POST /orders/:id/cancel (unstarted only); POST /orders/:id/reconcile {paymentId} (provider fetch required). Catalog additions: GET/PATCH/DELETE categories and brands, GET products/:id, PUT products/:id/images, POST products/:id/variants, DELETE products/:id (unpublish), PATCH variants/:id/stock supports expectedStock. No arbitrary payment-status mutation or role escalation. Returns/refunds and marketing remain pending.

## Marketing
GET /api/marketing/campaign serves the saved homepage campaign or original default editorial copy. POST /api/marketing/newsletter records explicit consent, idempotently, without sending mail. Protected /api/admin/marketing endpoints: GET/PUT /campaign, GET /products?page=1, PATCH /products/:id {featured}, GET /newsletter (count only). Public catalogue supports featured=true. Mailing delivery and consent withdrawal workflow require policy and provider setup; no subscriber export or sending endpoint.

## Commerce administration
Admin-only GET/PUT /api/admin/commerce/coupons[/:code], GET /returns, PATCH /returns/:id. Coupons are single-code percentage discounts (1–90%) with minimum subtotal, activation and optional expiry; no usage caps or stacking. POST /api/orders/quote {coupon?} returns the authoritative discount quote; POST /api/orders accepts optional coupon and checks the total again under transaction. Order discount/code are immutable snapshots. Customers may GET/POST /api/returns/:orderId for owned delivered paid orders; admins review and mark receipt. No refund or restocking is implied by a return status. Policy eligibility, return labels, provider refunds and reconciliation remain separate release requirements.

Admin refunds: GET/POST /api/admin/refunds/:orderId, POST /:orderId/reconcile. Full test refunds only for received returns with a linked captured payment, unique local claim, provider receipt/amount/currency/payment checks and fetched status. Ambiguous outcomes require manual reconciliation; no duplicate retries or restocking. Customer return response includes refund status. Actual test provider credentials required.

Support: authenticated GET/POST /api/support (owned tickets); admin GET /api/admin/support, PATCH /api/admin/support/:id with response and ANSWERED/CLOSED state. Persistent requests, rate limits, owner isolation and admin audit events. No email delivery or SLA. Information pages are development drafts, not approved legal policies.
