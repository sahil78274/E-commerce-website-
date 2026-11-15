# BUNAVAT

A responsive React and Express fashion storefront with a persistent SQLite database. The repository was empty apart from its original README; this implementation uses Node's built-in SQLite instead of MongoDB so the application can run without an external database. Node 22.13+ (the `node:sqlite` module) is required. SQLite in Node 22 is experimental, and this single-node implementation is **not yet ready for production use**.

## What works

- Responsive storefront, catalog search, gender/category browsing, price sorting, product pages, stock-aware size selection, wishlist and persistent customer cart.
- Customer registration/login/logout with bcrypt password hashing and opaque, hashed server-side session tokens in HTTP-only cookies. Registration always creates a customer. API admin authorization is enforced server-side.
- Server-calculated Cash on Delivery checkout with delivery validation, atomic stock decrement, order history, owner-only order access, status timeline and cancellation with atomic stock restoration.
- Verified-purchase written reviews for delivered items, owner moderation and customer reporting.
- Delivered-order return requests and owner approval/rejection; duplicate requests and duplicate cancellation are blocked.
- Owner dashboard, product drafts/publication/editing/archive, multiple JPEG/PNG/WebP image uploads, size-and-colour variant stock management, manual order status transitions and optional manually entered courier/tracking text. Newsletter emails are stored locally; no mailing service is connected.
- The catalogue starts empty. Decorative editorial/category images remain on the site but are never used as catalogue products. Only owner-uploaded images may be published with products.

## Important limitations before launch

This is a working foundation, **not the complete platform described in the brief**. In particular, online payments (including Razorpay order creation, signature verification, webhooks and refunds), Shiprocket, automated emails/password reset, review images, customer address book, coupons, admin-managed homepage/banners, variant-specific images, return evidence uploads, refund workflows, configurable return windows/policies, advanced filters, and several requested admin screens are **not implemented**. The UI only offers COD; it never claims an online payment succeeded. Return handling is a basic whole-order request, not a complete reverse-logistics/refund workflow. Contact and policy pages are placeholder copy that must be replaced with legal and operational details. There is no full carousel, seeded customer reviews, fake tracking, or fabricated payment data.

Before real deployment, also add production security review, CSRF protections appropriate to the hosting topology, a further security review of input and image handling, email verification, password recovery, account lockout, session management, reliable backups, monitoring, accessibility and browser testing, more comprehensive migration tooling, and a scalable database/transaction strategy. The application sets `trust proxy` to one hop; adjust it to match your actual trusted reverse proxy rather than exposing the app directly to untrusted proxy headers. Rate limiting is in-memory and not shared between instances. Use HTTPS, a persistent filesystem and a single application instance. Consult Indian tax, privacy and consumer-law professionals before launch.

## Local setup

```sh
npm install
npm run dev
```

Open the Vite address shown in the terminal. Vite proxies `/api` and `/uploads` to the Express server on port 3001. The API creates `data/bunavat.sqlite` automatically with an empty catalogue. A one-time migration removes the original seed records; if an original seed product has an order or review it is archived instead to preserve history. Products using decorative images are unpublished until the owner supplies uploaded images. Uploaded images default to `data/uploads`; both the database and uploads need backups. They are excluded from Git.

Image uploads are decoded and converted to WebP. Default local storage requires a persistent volume; ephemeral server filesystems will lose uploads. For a managed persistent service, configure `IMAGE_STORAGE=s3`, `S3_BUCKET`, `AWS_REGION`, AWS credentials via the SDK credential chain, and optionally `S3_ENDPOINT` for an S3-compatible provider. The bucket can remain private: Express serves the saved image URLs. Switching storage backends requires copying existing objects to the new backend first. S3 is implemented but requires your credentials and has not been tested against a live provider. Removing an image from a product does not immediately delete the stored object.

Environment variables are documented in `.env.example`; export them or provide them through a process manager (the app does not read `.env` automatically). `PORT` controls the API port; update the Vite proxy if changing it during development.

### Owner setup

Run once against the same database used by the server. Use a strong unique password, set these variables securely (avoid placing the password in shell history), and unset them afterward:

```sh
export ADMIN_NAME='Store Owner' ADMIN_EMAIL='owner@example.com'
read -rs ADMIN_PASSWORD; export ADMIN_PASSWORD; echo
npm run setup-admin
unset ADMIN_PASSWORD ADMIN_NAME ADMIN_EMAIL
```

Sign in with that account, then visit `/admin`. Customer registration cannot grant admin privileges. The setup script creates a new owner account; it does not elevate an existing customer.

## Build and deployment

```sh
npm run build
NODE_ENV=production PORT=3001 npm start
```

The Express server serves the built frontend, API, and persistent uploads on the same origin. Put it behind HTTPS and a correctly configured reverse proxy. In production the session cookie is `Secure`, so plain HTTP cannot be used to sign in. Preserve `data/` across deployments; never ship a development database to production. Run a single instance with SQLite and ensure your host supports persistent storage.

For an embedded Arena preview on port 3001, run `npm run build` followed by `ALLOW_PREVIEW_EMBED=1 npm start`. This opt-in disables the `X-Frame-Options` header so the preview can be embedded; leave it unset in normal deployments.

## Tests

```sh
npm test
npm run build
npm audit --omit=dev
```

The integration test starts an isolated API and covers an empty catalogue, registration/login, admin permissions, uploaded image persistence, draft/publish validation, multiple variants, public search, price and inventory edits, stock limits, COD placement, order privacy, variant removal, cancellation and safe archival. It does not cover Razorpay/Shiprocket (not implemented), browser rendering, responsive layout, password reset, or the other missing features above.

## API overview

All paths are under `/api`. Mutations use JSON except image upload. Authenticated endpoints require the session cookie; admin endpoints additionally require the server-side admin role. Prices are whole INR.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/register`, `/login`, `/logout` | Account/session |
| GET | `/me` | Current session |
| GET | `/products`, `/products/:slug` | Active catalog and variants; supports `gender`, `category`, `search`, `sort` |
| GET, POST | `/wishlist`, `/wishlist/:id` | List/toggle saved products |
| GET, POST | `/cart` | List/add variant |
| PATCH, DELETE | `/cart/:variantId` | Change quantity/remove |
| POST, GET | `/orders` | Place COD order/list own orders |
| GET | `/orders/:id` | Own order, items and timeline |
| POST | `/orders/:id/cancel`, `/orders/:id/return` | Cancel eligible order/request return |
| GET, POST | `/products/:slug/reviews` | Approved reviews / verified-purchase submission |
| POST | `/reviews/:id/report` | Report an approved review |
| GET, PATCH | `/admin/reviews`, `/admin/reviews/:id` | Owner review moderation |
| POST | `/newsletter` | Store an email subscription |
| GET | `/admin/overview`, `/admin/orders`, `/admin/returns`, `/admin/products` | Owner views |
| POST, GET, PUT, DELETE | `/admin/products`, `/admin/products/:id` | Create/read/edit/archive product |
| POST | `/admin/upload` | Owner multipart field `image`, JPEG/PNG/WebP, max 5 MB |
| PATCH | `/admin/variants/:id`, `/admin/orders/:id`, `/admin/returns/:id` | Stock, status or return decision |

Order totals and stock are determined by the server. All payment methods except COD are rejected; there are no payment or shipping credentials to configure in this version.
