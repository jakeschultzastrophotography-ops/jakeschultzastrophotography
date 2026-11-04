# Stripe checkout with manual WhiteWall fulfillment

## Current state

The integration is implemented locally but sales are disabled. The user selected an unframed 20 × 17-inch glossy print, cropped to fill without borders, US-only shipping, and a $50 markup over WhiteWall's print cost. The actual-image quote was verified October 28 at $33.95 before shipping and tax, giving a retail price of $83.95. WhiteWall confirmed the configuration was saved, and the matching one-time Stripe product and price were created. The user approved $7.95 flat US shipping, covering any additional lab delivery surcharge; the customer total is $91.90 before applicable tax. Webhook registration, deployment, and end-to-end payment verification remain pending. No WhiteWall order has been placed.

Existing calendar Buy Buttons are unchanged. Print orders use separate dynamically created Checkout Sessions and a dedicated webhook. Stripe stores the durable order/payment record; there is no separate order database or automatic WhiteWall submission.

## Catalog

Edit `netlify/lib/print-catalog.mjs`. Add approved variants using the shape documented there. Each variant includes a stable photograph ID from `src/data/photographs.js`, a unique variant ID, product, size, material, frame, price in cents, and an accurate crop description. Review original file dimensions and crop before enabling a variant. Set approved flat shipping in cents and permitted countries. Initial scope is one print per checkout in USD.

The frontend fetches approved variants from `print-catalog`; it cannot set prices. Frontend `printEnabled` fields from the original scaffold are not the sales authority. The server catalog and environment switch control eligibility. No invented WhiteWall sizes or prices are shipped.

## Netlify environment settings

Set server-side variables in Netlify, initially using Stripe test mode:

- `STRIPE_SECRET_KEY`: existing account's test secret key initially.
- `STRIPE_PRINT_WEBHOOK_SECRET`: signing secret for this dedicated endpoint.
- `PRINT_SITE_URL`: canonical HTTPS site origin, no path or query.
- `PRINT_ORDERING_ENABLED`: leave `false` until test checkout, shipping, tax setup, and fulfillment procedure are verified; set `true` to enable the approved catalog.

Never use VITE-prefixed secret variables. Do not paste keys into chat or commit them. No WhiteWall token is required for manual orders.

Register `https://YOUR-DOMAIN/.netlify/functions/print-webhook` in Stripe for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Keep calendar webhook settings intact. Checkout uses Stripe dynamic payment methods configured in the Dashboard. Stripe Tax is controlled by `PRINT_TAX_ENABLED`. Keep it `false` in test until a valid test tax configuration is verified, and keep sales disabled until the account�s live tax settings, product code, and active registrations are verified. Automatic tax does not collect in a jurisdiction without an active registration. Check costs and configuration in your Stripe account.

Use Netlify Dev or a Netlify deploy preview to test functions; Vite alone does not serve Netlify Functions. A preview requires its own matching `PRINT_SITE_URL` and test-mode webhook configuration.

## Manual fulfillment procedure

1. Monitor Stripe payments for descriptions starting `Manual WhiteWall print`. Enable successful-payment notifications in your Stripe account if desired; this code does not send merchant emails.
2. Open the payment and confirm it succeeded, has not been refunded, and is not already submitted. Metadata records photograph, variant, material, size, frame, crop and `fulfillment_status=unsubmitted`. The signed webhook adds `print_payment_verified=true` and the Checkout Session ID. Inspect the Checkout Session for collected delivery details and shipping charges; do not confuse billing and shipping addresses.
3. Use a private print master, manually configure the matching product at WhiteWall, enter the customer's delivery address, and pay WhiteWall separately. Review actual cost, crop, and address before submitting.
4. Immediately record the WhiteWall order number in Stripe payment metadata and change `fulfillment_status` to `submitted`. Add tracking and update to `shipped` later. Check this record before any retry to prevent duplicate production orders. Webhook retries never reset this status.
5. Send customer tracking/updates manually. Enable Stripe customer receipts if desired. Handle refunds and WhiteWall cancellations separately; this integration does not synchronize them.

Stripe is the durable register, not an automated fulfillment queue. There is no dashboard in this site, no merchant email service, and no tracking automation. Monitor Stripe even if a webhook delivery fails; payment records and order specifications already exist before webhook processing. The confirmation page only reports Stripe payment status, never assumes a redirect means success.

## Validation and launch gates

Run `node --test tests/print-commerce.test.mjs` and `npm run build`. Offline tests exercise disabled sales, tampered prices, invalid options, repeat checkout keys, real SDK webhook signature validation, unpaid/calendar isolation, and webhook retries.

Before launch, complete a Stripe test payment and verify delivery address, taxes, shipping, receipt behavior, order metadata and the signed webhook in the actual account. Verify cancellation and a declined test payment. Confirm the manual order process and customer service/returns terms. Then configure live keys and live webhook separately. No live payment has been tested by this setup.

Keep originals in private storage outside the public repository. Existing public master-named files remain public; this change does not privatize them. Existing site publishing endpoints also still require a separate authentication review before production launch.

## October 28 continuation verification

The live Stripe product and $83.95 price were reverified in the signed-in dashboard. WhiteWall initially could not restore the saved configuration while signed out. After the user signed in, the correct source and configuration loaded. The user adjusted the crop directly during review; it was saved as a separate configuration and restored after reload. The matching reduced-resolution preview is now installed locally; the original remains private and unchanged.

Prices now use explicit per-variant `stripePriceIds.live` and `stripePriceIds.test` mappings. The secret key selects the mode. A missing mapping disables checkout; there is no live-price fallback in test mode or inline-price fallback. Before creating a session, the server checks Stripe's actual price mode, active status, one-time type, currency, amount and exclusive-tax setting. Populate the test mapping with a verified test price in this account before end-to-end testing.

Enabling a variant also requires `sourceApproved: true` and `cropPreview: { src: '/images/prints/NAME.webp', approved: true, revision: 'REVIEW-ID' }`. Publish only a reduced-resolution preview of the exact approved print crop. Compare it against WhiteWall before marking it approved; keep masters private. The configurator shows that preview, and the order metadata records its revision. The first variant remains disabled, with its user-adjusted preview installed. The test product prod_VWlMDCYqAy1cv2 and test price price_1UVhpPE9TNuvn9mC1OR7ZFbG were created and verified at $83.95, one-time, tax exclusive. End-to-end verification remains pending.

Nine offline commerce tests passed and a fresh production build passed in a separate scratch output directory. Netlify project voluble-taffy-53ab89 was inspected and initially had no environment variables configured; PRINT_ORDERING_ENABLED=false has now been added. Stripe credentials and the dedicated webhook remain pending. No deployment, live payment, or WhiteWall order was performed.

## Background review — October 28

Fixed a checkout retry defect: the integration identifier was regenerated on every request while the idempotency key stayed the same. It is now derived deterministically from the request UUID, so retries send identical parameters. The regression test now compares the complete Stripe request payload as well as the idempotency key. All nine commerce tests pass.

The Vite production code build passed in a separate scratch output directory with public-file copying disabled. This verifies compilation, not a complete deployable package or live checkout. No deployment was performed, and the catalog remains disabled.

The current local .env and process environment contain none of the five print-ordering variables. No secret values were printed. Browser verification confirmed the test price is $83.95 USD, one-time, tax exclusive, and Netlify PRINT_ORDERING_ENABLED is false. Test credentials, webhook registration, a controlled test deployment and checkout success/cancel/decline/webhook verification remain pending.

The pre-existing siteConfigSave.js and command-center-release.js handlers do not authenticate incoming callers before performing configured GitHub writes. Their production reachability and credentials were not tested. Resolve authentication or exclude these endpoints before launch; they were not changed in this review.