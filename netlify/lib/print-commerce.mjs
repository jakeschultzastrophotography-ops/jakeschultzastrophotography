import { createHash } from 'node:crypto';
import Stripe from 'stripe';
import { photographs } from '../../src/data/photographs.js';
import { printCatalog } from './print-catalog.mjs';

export const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });
export const stripeClient = (env = process.env) => new Stripe(env.STRIPE_SECRET_KEY);
export function stripeMode(env = process.env) {
  return /^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY || '') ? 'test' : /^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY || '') ? 'live' : null;
}
export function priceIdFor(variant, env = process.env) {
  const mode = stripeMode(env);
  const priceId = mode && variant.stripePriceIds?.[mode];
  return /^price_[A-Za-z0-9]+$/.test(priceId || '') ? priceId : null;
}
export function hasApprovedPreview(variant) {
  const preview = variant.cropPreview;
  return variant.sourceApproved === true && preview?.approved === true &&
    typeof preview.revision === 'string' && preview.revision.trim().length > 0 &&
    /^\/images\/prints\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(preview.src || '');
}
export function approvedVariants(catalog = printCatalog) {
  return catalog.variants.filter(v => v.enabled === true && hasApprovedPreview(v) && photographs.some(p => p.id === v.photographId) &&
    ['id', 'product', 'size', 'material', 'frame', 'cropDescription'].every(k => typeof v[k] === 'string' && v[k].trim()) &&
    Number.isSafeInteger(v.priceCents) && v.priceCents > 0);
}
export function configured(env = process.env, catalog = printCatalog) {
  return env.PRINT_ORDERING_ENABLED === 'true' && Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_PRINT_WEBHOOK_SECRET) &&
    /^https:\/\/[^/]+\/?$/.test(env.PRINT_SITE_URL || '') &&
    catalog.currency === 'usd' && Number.isSafeInteger(catalog.shippingCents) && catalog.shippingCents >= 0 &&
    catalog.allowedCountries.length > 0 && approvedVariants(catalog).length > 0 &&
    approvedVariants(catalog).every(v => priceIdFor(v, env));
}
export function makeCheckout({ env = process.env, catalog = printCatalog, getStripe = () => stripeClient(env) } = {}) {
  return async event => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
    if (!configured(env, catalog)) return json(503, { error: 'Print ordering is not available yet.' });
    let input;
    try { input = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'Invalid request.' }); }
    if (!input || typeof input !== 'object' || !/^[a-f0-9-]{36}$/i.test(input.requestId || '') || input.quantity !== 1 || input.cropConfirmed !== true) return json(400, { error: 'Confirm the print crop and select one print.' });
    const variant = approvedVariants(catalog).find(v => v.id === input.variantId && v.photographId === input.photographId);
    if (!variant) return json(400, { error: 'This print option is unavailable.' });
    const photo = photographs.find(p => p.id === variant.photographId);
    const origin = env.PRINT_SITE_URL.replace(/\/$/, '');
    const metadata = { order_type: 'whitewall_manual_print', photograph_id: photo.id, variant_id: variant.id,
      product: variant.product, size: variant.size, material: variant.material, frame: variant.frame,
      crop: variant.cropDescription, crop_revision: variant.cropPreview.revision, fulfillment_status: 'unsubmitted' };
    try {
      const stripe = getStripe();
      const priceId = priceIdFor(variant, env);
      const price = await stripe.prices.retrieve(priceId);
      if (!price.active || price.type !== 'one_time' || price.currency !== catalog.currency ||
          price.unit_amount !== variant.priceCents || price.tax_behavior !== 'exclusive' ||
          price.livemode !== (stripeMode(env) === 'live')) {
        return json(503, { error: 'This print price needs verification before checkout.' });
      }
      const session = await stripe.checkout.sessions.create({
        mode: 'payment', integration_identifier: `nebula-print-${stripeMode(env)}-${createHash('sha256').update(input.requestId).digest('hex').slice(0, 8).replace(/[0-9a-f]/g, digit => String.fromCharCode(97 + parseInt(digit, 16)))}`, 
        line_items: [{ quantity: 1, price: priceId }],
        shipping_address_collection: { allowed_countries: catalog.allowedCountries },
        shipping_options: [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: catalog.shippingCents, currency: catalog.currency }, display_name: 'Print shipping', tax_behavior: 'exclusive' } }],
        automatic_tax: { enabled: env.PRINT_TAX_ENABLED === 'true' },
        billing_address_collection: 'required',
        metadata, payment_intent_data: { metadata, description: `Manual WhiteWall print: ${photo.title} / ${variant.id}` },
        success_url: `${origin}/?print_checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?print_checkout=cancelled`,
      }, { idempotencyKey: `print-${input.requestId}` });
      return json(200, { url: session.url });
    } catch { return json(502, { error: 'Unable to open checkout. Please try again.' }); }
  };
}
export function makeWebhook({ env = process.env, getStripe = () => stripeClient(env) } = {}) {
  return async event => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRINT_WEBHOOK_SECRET) return json(503, { error: 'Webhook not configured.' });
    const stripe = getStripe();
    let notification;
    try {
      const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
      notification = stripe.webhooks.constructEvent(body, event.headers?.['stripe-signature'] || event.headers?.['Stripe-Signature'], env.STRIPE_PRINT_WEBHOOK_SECRET);
    } catch { return json(400, { error: 'Invalid signature.' }); }
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(notification.type)) return json(200, { received: true });
    const session = notification.data.object;
    if (session.metadata?.order_type !== 'whitewall_manual_print' || session.payment_status !== 'paid') return json(200, { received: true });
    try {
      // Stripe is the durable order register. Only append verification; never
      // overwrite fulfillment status, including when Stripe retries old events.
      await stripe.paymentIntents.update(session.payment_intent, { metadata: { print_payment_verified: 'true', checkout_session_id: session.id } });
      return json(200, { received: true });
    } catch { return json(500, { error: 'Unable to record confirmation. Retry required.' }); }
  };
}
