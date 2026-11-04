import { approvedVariants, configured, json } from '../lib/print-commerce.mjs';
import { printCatalog } from '../lib/print-catalog.mjs';
export async function handler(event) {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed.' });
  const enabled = configured();
  return json(200, { enabled, currency: printCatalog.currency, shippingCents: enabled ? printCatalog.shippingCents : null, variants: enabled ? approvedVariants().map(({ id, photographId, product, size, material, frame, priceCents, cropDescription, cropPreview }) => ({ id, photographId, product, size, material, frame, priceCents, cropDescription, cropPreview })) : [] });
}
