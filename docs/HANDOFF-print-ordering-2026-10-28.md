# Print ordering handoff — October 28, 2026

## Start here

Continue work in `C:\Users\Custom\jakeschultzastrophotography`. First test browser access in the new chat. Preserve the existing working tree: it contains print-ordering work and unrelated icon/site changes. Do not reset, overwrite, commit, or deploy everything indiscriminately.

The user wants action with minimal repeated confirmations and idle retries. Their browser setting is ON. Do not tell them it is off based solely on the connector error.

## Approved product and business decisions

- Start with the first gallery image, North American Nebula, then proceed in gallery order.
- Unframed Fuji Crystal DP II glossy photo print, 20 × 17 inches, landscape.
- Crop to fill; no white border. User approved cropping, but exact crop review remains marked pending in local launch records. Reconcile those records with the saved configuration before launch.
- Retail price is WhiteWall print cost plus $50: $33.95 + $50 = **$83.95**.
- **US shipping $7.95**, explicitly approved; seller covers any extra WhiteWall delivery surcharge.
- Customer total **$91.90 before tax**.
- Stripe checkout; manual WhiteWall fulfillment initially. Keep the Netlify site.
- Original print masters stay private, outside public deployment assets. Preserve originals.

## Current local state (verified when writing this handoff)

`netlify/lib/print-catalog.mjs` contains the first variant with price 8395 cents, shipping 795 cents, US-only destinations, the live Stripe price ID below, and **enabled: false**. Ordering is not ready to launch.

Relevant files:

- `src/data/photographs.js` — shared gallery identities.
- `src/components/PrintOrderButton.jsx`
- `src/components/PrintConfigurator.jsx`
- `src/components/PrintCheckoutResult.jsx`
- `netlify/functions/print-catalog.js`
- `netlify/functions/print-checkout.js`
- `netlify/functions/print-status.js`
- `netlify/functions/print-webhook.js`
- `netlify/lib/print-catalog.mjs`
- `netlify/lib/print-commerce.mjs`
- `tests/`
- `docs/print-ordering.md`
- `docs/print-launch-queue.json`
- `docs/whitewall-print-quote.md`

Git status includes modified package files, application files and icons, plus untracked commerce files/docs/tests. No commit or deployment was performed during this handoff.

## Prior-session results — verify externally before relying on current state

### WhiteWall

Original used: `private-print-masters/originals/01-north-american-nebula-wz2g3f.jpg`, reported 7887 × 5291 pixels, about 32 MB.

Saved configuration name: **North American Nebula - 20x17 Glossy Unframed**.

Saved configuration URL:
https://www.whitewall.com/us/configurator?room_configuration_id=5a87c440-df33-45d3-a6a1-48cb3f855314

Prior UI confirmed the configuration was saved, but did not prove it was saved in the signed-in account. No WhiteWall order was placed.

Configuration: no frame, border or lamination; standard corners; one piece; SuperResolution/ultraHD off; image optimization 0%. Actual-image print price $33.95 was verified October 28. Delivery surcharge still needs checking.

Prior evidence filenames under the private print-master area include `whitewall-saved-first-print.png`, `whitewall-saved-first-print.json`, and earlier `whitewall-first-print.png`. Locate rather than assume their full paths. Saved URL and image identifiers are working references, not API credentials.

### Stripe

Account: Jake Schultz Astrophotography, `acct_1SFpezE9TNuvn9mC`.

Created live product:

- Name: **North American Nebula — 20 × 17″ Glossy Unframed Print**
- Product: `prod_VWd9eZT3NzReTr`
- One-time USD price: `price_1UVZt2E9TNuvn9mCanOzivuH`
- Amount: $83.95; tax exclusive.
- Dashboard: https://dashboard.stripe.com/acct_1SFpezE9TNuvn9mC/products/prod_VWd9eZT3NzReTr

Prior UI verified creation. No product image uploaded yet. Default Printing tax category `txcd_20090028` was selected; verify suitability and tax setup before launch. Existing calendar product `prod_TCEzN3Vg9FHtRY` must remain unchanged.

Prior private evidence filenames: `stripe-first-print.png` and `stripe-first-print.json`.

No checkout payment, payment link, webhook setup, credential installation, or live deployment was completed. Do not claim otherwise.

## Implementation and remaining work

Prior code review found server-owned variant/pricing selection, quantity one, crop acknowledgement, request UUID/idempotency, US shipping restriction, and signed Stripe webhook handling. Six tests reportedly passed after the price-ID change; this handoff did not rerun them. An earlier build passed before the newest price-ID changes, so run an appropriate fresh build before release.

1. Recover browser access and verify WhiteWall/Stripe state without duplicating products.
2. Inspect the existing code and documentation, including launch queue flags.
3. **Resolve live/test Stripe price separation.** The catalog currently hardcodes a live price ID; test-mode checkout cannot use that ID. Configure a test price or explicit environment mapping before testing.
4. Verify the exact cropped preview matches the print. The frontend previously displayed the full gallery image rather than the exact print crop.
5. Reconcile crop/source approval records; update stale notes that still say shipping policy is pending. Shipping is already approved at $7.95.
6. Configure Netlify environment variables securely; never print secret values. Prior requirements: `PRINT_ORDERING_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_PRINT_WEBHOOK_SECRET`, and HTTPS `PRINT_SITE_URL`. Recheck code for current requirements. Local keys were previously absent.
7. Verify Stripe tax setup, webhook delivery, checkout success/cancel/status, fulfillment metadata and test payment flow.
8. Keep catalog disabled until launch requirements are met. Deploy only the intended reviewed changes; do not include private masters.
9. Continue remaining gallery products after the first flow is verified.

## Browser blocker and investigation

The user repeatedly confirmed Settings > Browser is ON and supplied a screenshot showing that. The in-app browser is open, most recently with two tabs and https://stripe.com/ selected. Earlier preference was Chrome; user also authorized the built-in browser during troubleshooting.

Current tool failure, reproduced October 28:

> Local browser use is disabled in Work settings

This occurs before browser inventory/tab access. Resetting `mcp__cua_repl` did not resolve it. Native app inventory can work while browser inventory fails. Do not use native UI or alternative transports to circumvent a permission denial.

Read-only findings:

- No explicit browser-disable setting was found in the user config/requirements files checked.
- Bundled connector validates a signed per-turn permission response from the app; the error is raised when that response does not grant access. Do not patch this check or spoof permission state.
- Local app logs simultaneously report `browser_use_availability_resolved available=true browserPane=true reason=available` on Windows, release `26.1023.50603`.
- Logs also report the built-in browser backend startup ready.
- This supports an app/connector state mismatch; it does not establish the precise root cause.
- No available tool was found to repair the app's permission state. No app preferences or security controls were modified.

Log directory inspected:
`C:\Users\Custom\AppData\Local\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\Codex\Logs`

Official troubleshooting documents trying a new chat to clear chat-specific connection state:
https://learn.chatgpt.com/docs/chrome-extension#troubleshooting

If a fresh chat still fails, avoid repeated unproductive retries. Report the exact error and conflicting availability logs through the app's `/feedback` flow (user submission), with originating chat ID `01a0ce70-7d1f-7b73-9db9-a6bee0fb035c`. Do not claim browser access is repaired until a real tab can be read.

## Scope and preservation

This handoff contains no API keys or passwords. It is project documentation, not a memory update. User's CS2 asset instructions do not authorize unrelated game/asset changes and are not relevant to this print-ordering work. Do not launch games, alter protected assets, move originals, or change unrelated settings.
