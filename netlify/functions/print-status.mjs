import { json, stripeClient } from '../lib/print-commerce.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed.' });
  const id = event.queryStringParameters?.session_id;
  if (!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(id || '')) return json(400, { error: 'Invalid checkout reference.' });
  try {
    const session = await stripeClient().checkout.sessions.retrieve(id);
    if (session.metadata?.order_type !== 'whitewall_manual_print') return json(404, { error: 'Order not found.' });
    return json(200, { paid: session.payment_status === 'paid' });
  } catch { return json(503, { error: 'Unable to confirm payment right now.' }); }
}
