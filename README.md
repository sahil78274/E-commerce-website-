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

## Project structure

```text
client/                React app, public images and Vite configuration
  src/                 Existing components and styles
  public/              Decorative images
  package.json         Frontend dependencies and commands
  .env.example         Public development proxy setting
server/
  src/index.js         Express app and existing API routes
  src/routes/          Product administration and image upload routes
  src/db.js            SQLite schema and migrations
  src/admin.js         Owner setup command
  src/load-env.js      Server-local environment loader
  src/paths.js         Stable database, uploads and client build paths
  package.json         Backend dependencies and commands
  .env.example         Backend-only configuration
data/                  Runtime database and uploads (not committed)
tests/                 Integration, migration and path tests
package.json           npm workspaces and root commands
```

No placeholder models, middleware, or upload folders are created: the existing SQLite schema and middleware remain in the backend source, while uploads stay in the existing persistent `data/uploads` location.

## Local setup

Node 22.13+ and npm are required. From the repository root:

```sh
npm install
test -f server/.env || cp server/.env.example server/.env
npm run dev
```

This starts Vite on **http://localhost:5173** and Express on **http://localhost:5000**. Alternatively run each in its own terminal (the packages are npm workspaces; installations from either folder use the root lockfile):

```sh
cd server
npm install
npm run dev
```

```sh
cd client
npm install
npm run dev
```

Vite proxies `/api` and `/uploads` to Express on port 5000 while preserving the original host and cookies. Browser code uses same-origin URLs; no CORS changes are required. The API creates `data/bunavat.sqlite` automatically with an empty catalogue. A one-time migration removes the original seed records; if an original seed product has an order or review it is archived instead to preserve history. Products using decorative images are unpublished until the owner supplies uploaded images. Uploaded images default to `data/uploads`; both the database and uploads need backups. They are excluded from Git.

Image uploads are decoded and converted to WebP. Default local storage requires a persistent volume; ephemeral server filesystems will lose uploads. For a managed persistent service, configure `IMAGE_STORAGE=s3`, `S3_BUCKET`, `AWS_REGION`, AWS credentials via the SDK credential chain, and optionally `S3_ENDPOINT` for an S3-compatible provider. The bucket can remain private: Express serves the saved image URLs. Switching storage backends requires copying existing objects to the new backend first. S3 is implemented but requires your credentials and has not been tested against a live provider. Removing an image from a product does not immediately delete the stored object.

Copy `server/.env.example` to `server/.env` if it does not already exist, and edit `server/.env` privately. Both the server and owner setup command load it automatically, regardless of the working directory. Exported process environment variables take precedence over the file, including `DB_PATH`, `UPLOAD_DIR`, and `NODE_ENV`. The file is ignored by Git and is not distributed with the repository; never commit it or place backend secrets in `client/`. `client/.env.example` contains only the optional public `VITE_PROXY_TARGET`; Vite loads a copied `client/.env` automatically. `PORT` controls the API port; set `VITE_PROXY_TARGET` to match if changing it. The pre-existing root `.env`, if present, is not moved or overwritten.

To preserve existing installations, default database and upload locations remain **repository-root** `data/bunavat.sqlite` and `data/uploads`, regardless of whether the server is started from the root or `server/`. Relative `DB_PATH` and `UPLOAD_DIR` overrides are also resolved from the repository root; absolute overrides continue to work. Back up these locations before upgrading and keep them on persistent storage. No database or uploads need to be moved.

### Owner setup

Run once against the same database used by the server:

1. Create `server/.env` from `server/.env.example` if it does not already exist (the command above does not overwrite an existing file).
2. Privately edit `server/.env` and set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` of at least 10 characters. Use an editor rather than typing a password in shell history. Values are not logged.
3. From the repository root run:

   ```sh
   npm run setup-admin
   ```

   Alternatively, run `npm run setup-admin` from `server/`. Existing exported variables with the same names override the file.
4. Remove the password from `server/.env` after creating the owner, and restart the server if needed. Keep the remaining file private; it is ignored by Git.

Sign in with that account, then visit `/admin`. Customer registration cannot grant admin privileges. The setup script creates a new owner account; it does not elevate an existing customer.

## Build and deployment

```sh
npm run build
PORT=5000 npm start
```

The build is written to `client/dist`. The Express server serves that frontend, API, and persistent uploads on the same origin regardless of its working directory. Put it behind HTTPS and a correctly configured reverse proxy. In production the session cookie is `Secure`, so plain HTTP cannot be used to sign in. Preserve `data/` across deployments; never ship a development database to production. Run a single instance with SQLite and ensure your host supports persistent storage.

For an embedded Arena preview on port 3001, run `npm run build` followed by `PORT=3001 ALLOW_PREVIEW_EMBED=1 npm start`. This opt-in disables the `X-Frame-Options` header so the preview can be embedded; leave it unset in normal deployments.

## Tests

```sh
npm test
npm run build
npm audit --omit=dev
```

The integration test starts isolated Express and Vite processes and exercises the proxy, customer/admin login, admin permissions, uploaded image persistence, draft/publish validation, multiple variants, public search, price and inventory edits, stock limits, COD placement, order privacy, variant removal, cancellation, reviews, return approvals and safe archival. Migration and path tests check history preservation and stable storage paths from both working directories. The environment test uses an isolated temporary database and a generated credential to check file loading and process-environment precedence without touching the real server environment or database. `npm test` builds the client first. It does not cover Razorpay/Shiprocket (not implemented), browser rendering, responsive layout, password reset, or the other missing features above.

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
