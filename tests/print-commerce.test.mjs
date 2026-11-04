import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { makeCheckout, makeWebhook, configured, approvedVariants } from '../netlify/lib/print-commerce.mjs';
const env = { PRINT_ORDERING_ENABLED: 'true', STRIPE_SECRET_KEY: 'sk_test_placeholder', STRIPE_PRINT_WEBHOOK_SECRET: 'whsec_test', PRINT_SITE_URL: 'https://example.com' };
const catalog = { currency: 'usd', shippingCents: 1000, allowedCountries: ['US'], variants: [{ id: 'test-print', photographId: 'm31-andromeda-galaxy', product: 'Test only', size: '12 x 8', material: 'Paper', frame: 'None', priceCents: 5000, cropDescription: 'Full image', sourceApproved: true, cropPreview: { src: '/images/prints/test.webp', approved: true, revision: 'test-v1' }, stripePriceIds: { test: 'price_testApproved', live: 'price_liveApproved' }, enabled: true }] };
const input = { photographId: 'm31-andromeda-galaxy', variantId: 'test-print', quantity: 1, cropConfirmed: true, requestId: '00000000-0000-4000-8000-000000000000', priceCents: 1 };
const priceRecord = { active: true, type: 'one_time', currency: 'usd', unit_amount: 5000, tax_behavior: 'exclusive', livemode: false };
const prices = { retrieve: async () => priceRecord };
const event = body => ({ httpMethod: 'POST', body: JSON.stringify(body) });
test('disabled catalog cannot open checkout', async () => {
  const handler = makeCheckout({ env: {}, catalog, getStripe: () => { throw Error('Must not contact Stripe'); } });
  assert.equal((await handler(event(input))).statusCode, 503);
});
test('checkout rejects malformed, unknown, unapproved and multiple-print requests', async () => {
  const handler = makeCheckout({ env, catalog, getStripe: () => { throw Error('Must not contact Stripe'); } });
  for (const body of [null, { ...input, variantId: 'unknown' }, { ...input, quantity: 2 }, { ...input, cropConfirmed: false }, { ...input, photographId: 'wrong' }]) assert.equal((await handler(event(body))).statusCode, 400);
  assert.equal((await handler({ httpMethod: 'POST', body: '{' })).statusCode, 400);
});
test('checkout uses server amounts and stable retry keys, preserves manual order details', async () => {
  const calls = [];
  const handler = makeCheckout({ env, catalog, getStripe: () => ({ prices, checkout: { sessions: { create: async (...args) => { calls.push(args); return { url: 'https://checkout.stripe.com/test' }; } } } }) });
  assert.equal((await handler(event(input))).statusCode, 200);
  await handler(event(input));
  assert.deepEqual(calls[0][0].line_items, [{ quantity: 1, price: 'price_testApproved' }]);
  assert.equal(calls[0][0].metadata.crop_revision, 'test-v1');
  assert.deepEqual(calls[0][0].shipping_address_collection.allowed_countries, ['US']);
  assert.equal(calls[0][0].shipping_options[0].shipping_rate_data.fixed_amount.amount, 1000);
  assert.deepEqual(calls[0][1], calls[1][1]);
  assert.deepEqual(calls[0][0], calls[1][0], 'Retries must send identical parameters to Stripe');
  assert.equal(calls[0][0].payment_intent_data.metadata.order_type, 'whitewall_manual_print');
  assert.equal(calls[0][0].automatic_tax.enabled, false);
  assert.match(calls[0][0].integration_identifier, /^nebula-print-test-[a-p]{8}$/);
});
const sdk = new Stripe('sk_test_placeholder');
test('checkout uses the catalog Stripe price and ignores a client-supplied price ID', async () => {
  let request;
  const pricedCatalog = { ...catalog, variants: [{ ...catalog.variants[0], stripePriceIds: { test: 'price_serverApproved', live: 'price_liveApproved' } }] };
  const handler = makeCheckout({ env, catalog: pricedCatalog, getStripe: () => ({ prices, checkout: { sessions: { create: async params => { request = params; return { url: 'https://checkout.stripe.com/test' }; } } } }) });
  assert.equal((await handler(event({ ...input, stripePriceId: 'price_attacker' }))).statusCode, 200);
  assert.deepEqual(request.line_items, [{ quantity: 1, price: 'price_serverApproved' }]);
});
function signed(type, session, base64 = false) {
  const body = JSON.stringify({ id: 'evt_test', type, data: { object: session } });
  return { httpMethod: 'POST', body: base64 ? Buffer.from(body).toString('base64') : body, isBase64Encoded: base64, headers: { 'stripe-signature': sdk.webhooks.generateTestHeaderString({ payload: body, secret: env.STRIPE_PRINT_WEBHOOK_SECRET }) } };
}
const paid = { id: 'cs_test_123', payment_intent: 'pi_test', payment_status: 'paid', metadata: { order_type: 'whitewall_manual_print' } };
test('webhook verifies signatures, ignores calendar/unpaid events and handles retries without resetting fulfillment', async () => {
  const writes = [];
  const handler = makeWebhook({ env, getStripe: () => ({ webhooks: sdk.webhooks, paymentIntents: { update: async (...args) => writes.push(args) } }) });
  assert.equal((await handler(event({}))).statusCode, 400);
  await handler(signed('checkout.session.completed', { ...paid, metadata: {} }));
  await handler(signed('checkout.session.completed', { ...paid, payment_status: 'unpaid' }));
  assert.equal(writes.length, 0);
  assert.equal((await handler(signed('checkout.session.completed', paid, true))).statusCode, 200);
  await handler(signed('checkout.session.completed', paid));
  assert.deepEqual(writes[0], writes[1]);
  assert.equal(writes[0][1].metadata.print_payment_verified, 'true');
  assert.equal(writes[0][1].metadata.fulfillment_status, undefined);
});
test('webhook persistence failures request Stripe retry', async () => {
  const handler = makeWebhook({ env, getStripe: () => ({ webhooks: sdk.webhooks, paymentIntents: { update: async () => { throw Error('Network failure'); } } }) });
  assert.equal((await handler(signed('checkout.session.completed', paid))).statusCode, 500);
});

test('test and live keys select only their explicit price mappings', async () => {
  for (const mode of ['test', 'live']) {
    let requestedPrice;
    let checkoutPrice;
    const handler = makeCheckout({ env: { ...env, STRIPE_SECRET_KEY: 'sk_' + mode + '_placeholder' }, catalog,
      getStripe: () => ({ prices: { retrieve: async id => { requestedPrice = id; return { ...priceRecord, livemode: mode === 'live' }; } },
        checkout: { sessions: { create: async params => { checkoutPrice = params.line_items[0].price; return { url: 'https://checkout.stripe.com/test' }; } } } }) });
    assert.equal((await handler(event(input))).statusCode, 200);
    assert.equal(requestedPrice, 'price_' + mode + 'Approved');
    assert.equal(checkoutPrice, requestedPrice);
  }
  const liveOnly = { ...catalog, variants: [{ ...catalog.variants[0], stripePriceIds: { live: 'price_liveApproved' } }] };
  assert.equal(Boolean(configured(env, liveOnly)), false);
  assert.equal(Boolean(configured({ ...env, STRIPE_SECRET_KEY: 'unknown' }, catalog)), false);
});

test('price mismatches stop checkout before a payment session is created', async () => {
  for (const changed of [{ active: false }, { type: 'recurring' }, { currency: 'eur' }, { unit_amount: 1 }, { tax_behavior: 'inclusive' }, { livemode: true }]) {
    const handler = makeCheckout({ env, catalog, getStripe: () => ({ prices: { retrieve: async () => ({ ...priceRecord, ...changed }) },
      checkout: { sessions: { create: async () => { assert.fail('Must not create a checkout session'); } } } }) });
    assert.equal((await handler(event(input))).statusCode, 503);
  }
});

test('unreviewed sources, missing previews and private paths cannot be offered', () => {
  for (const changed of [{ sourceApproved: false }, { cropPreview: null },
    { cropPreview: { ...catalog.variants[0].cropPreview, approved: false } },
    { cropPreview: { ...catalog.variants[0].cropPreview, src: '/private-print-masters/original.jpg' } },
    { cropPreview: { ...catalog.variants[0].cropPreview, revision: '' } }]) {
    assert.deepEqual(approvedVariants({ ...catalog, variants: [{ ...catalog.variants[0], ...changed }] }), []);
  }
});
