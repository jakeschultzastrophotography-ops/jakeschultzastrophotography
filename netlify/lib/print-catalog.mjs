// Server-owned catalog. Add only approved, crop-reviewed print combinations.
// Amounts are integer US cents. Keep private master locations out of this file.
export const printCatalog = {
  currency: 'usd',
  shippingCents: 795,
  allowedCountries: ['US'],
  variants: [
    {
      id: 'north-american-nebula-unframed-20x17-glossy',
      photographId: 'north-american-nebula-thumb-cropped',
      product: 'Photo print',
      size: '20 × 17 inches (landscape)',
      material: 'Fuji Crystal DP II glossy photo paper',
      frame: 'Unframed',
      priceCents: 8395,
      stripePriceIds: { live: 'price_1UVZt2E9TNuvn9mCanOzivuH', test: 'price_1UVhpPE9TNuvn9mC1OR7ZFbG' },
      sourceApproved: true,
      // Set only after comparison with the actual WhiteWall crop. Never use a private master URL.
      cropPreview: { src: '/images/prints/north-american-nebula-20x17-adjusted-20261028.webp', approved: true, revision: '20261028-user-adjusted-v1' },
      cropDescription: 'Cropped to fill the 20 × 17-inch print with no white border.',
      pricing: { basis: 'WhiteWall print cost before tax and shipping', markupCents: 5000, verifiedLabCostCents: 3395, checkedAt: '2026-10-28' },
      enabled: true,
    },
    // Staged product ladder. These remain disabled until matching Stripe
    // Prices are created and the exact WhiteWall configurations are checked.
    // The 20 x 17 crop is retained at the same aspect ratio for every tier.
    {
      id: 'north-american-nebula-keepsake-12x10-paper', photographId: 'north-american-nebula-thumb-cropped',
      product: 'Photo print', size: '12 × 10.2 inches (landscape)', material: 'Fuji Crystal DP II glossy photo paper', frame: 'Unframed',
      priceCents: 3995, stripePriceIds: { test: 'price_1UY8MFE9TNuvn9mCRQLDw7qs', live: 'price_1UY8YVE9TNuvn9mCRCrBipxW' }, sourceApproved: true,
      cropPreview: { src: '/images/prints/north-american-nebula-20x17-adjusted-20261028.webp', approved: true, revision: '20261028-user-adjusted-v1' },
      cropDescription: 'Scaled from the approved 20 × 17-inch crop with no white border.', enabled: true,
    },
    {
      id: 'north-american-nebula-centerpiece-30x25-paper', photographId: 'north-american-nebula-thumb-cropped',
      product: 'Photo print', size: '30 × 25.5 inches (landscape)', material: 'Fuji Crystal DP II glossy photo paper', frame: 'Unframed',
      priceCents: 14995, stripePriceIds: { test: 'price_1UY8ROE9TNuvn9mCZ60X8Xpg' }, sourceApproved: true,
      cropPreview: { src: '/images/prints/north-american-nebula-20x17-adjusted-20261028.webp', approved: true, revision: '20261028-user-adjusted-v1' },
      cropDescription: 'Scaled from the approved 20 × 17-inch crop with no white border.', enabled: true,
    },
    {
      id: 'north-american-nebula-keepsake-12x10-canvas', photographId: 'north-american-nebula-thumb-cropped',
      product: 'Canvas print', size: '12 × 10.2 inches (landscape)', material: 'Glossy canvas on stretcher frame', frame: 'Gallery wrap',
      priceCents: 6995, stripePriceIds: { test: 'price_1UY8SCE9TNuvn9mCYFveL66K' }, sourceApproved: true,
      cropPreview: { src: '/images/prints/north-american-nebula-20x17-adjusted-20261028.webp', approved: true, revision: '20261028-user-adjusted-v1' },
      cropDescription: 'Scaled from the approved 20 × 17-inch crop with no white border.', enabled: true,
    },
    {
      id: 'north-american-nebula-centerpiece-30x25-canvas', photographId: 'north-american-nebula-thumb-cropped',
      product: 'Canvas print', size: '30 × 25.5 inches (landscape)', material: 'Glossy canvas on stretcher frame', frame: 'Gallery wrap',
      priceCents: 23995, stripePriceIds: { test: 'price_1UY8T3E9TNuvn9mCiuuStoRK' }, sourceApproved: true,
      cropPreview: { src: '/images/prints/north-american-nebula-20x17-adjusted-20261028.webp', approved: true, revision: '20261028-user-adjusted-v1' },
      cropDescription: 'Scaled from the approved 20 × 17-inch crop with no white border.', enabled: true,
    },
    {
      id: 'north-american-nebula-wall-20x17-canvas', photographId: 'north-american-nebula-thumb-cropped',
      product: 'Canvas print', size: '20 × 17 inches (landscape)', material: 'Glossy canvas on stretcher frame', frame: 'Gallery wrap',
      priceCents: 13995, stripePriceIds: { test: 'price_1UY8OsE9TNuvn9mC6CuiQRgs', live: 'price_1UY8ZmE9TNuvn9mC26EmoPIP' }, sourceApproved: true,
      cropPreview: { src: '/images/prints/north-american-nebula-20x17-adjusted-20261028.webp', approved: true, revision: '20261028-user-adjusted-v1' },
      cropDescription: 'The approved 20 × 17-inch crop with no white border.', enabled: true,
    },
    {
      id: 'north-american-nebula-keepsake-12x10-metal', photographId: 'north-american-nebula-thumb-cropped',
      product: 'Metal print', size: '12 × 10.2 inches (landscape)', material: 'Glossy photo print on aluminum backing', frame: 'Wall mount included',
      priceCents: 7995, stripePriceIds: { test: 'price_1UY8TvE9TNuvn9mCTKFMQras' }, sourceApproved: true,
      cropPreview: { src: '/images/prints/north-american-nebula-20x17-adjusted-20261028.webp', approved: true, revision: '20261028-user-adjusted-v1' },
      cropDescription: 'Scaled from the approved 20 × 17-inch crop with no white border.', enabled: true,
    },
    {
      id: 'north-american-nebula-centerpiece-30x25-metal', photographId: 'north-american-nebula-thumb-cropped',
      product: 'Metal print', size: '30 × 25.5 inches (landscape)', material: 'Glossy photo print on aluminum backing', frame: 'Wall mount included',
      priceCents: 27995, stripePriceIds: { test: 'price_1UY8UhE9TNuvn9mCuSZhOvrJ' }, sourceApproved: true,
      cropPreview: { src: '/images/prints/north-american-nebula-20x17-adjusted-20261028.webp', approved: true, revision: '20261028-user-adjusted-v1' },
      cropDescription: 'Scaled from the approved 20 × 17-inch crop with no white border.', enabled: true,
    },
    {
      id: 'north-american-nebula-wall-20x17-metal', photographId: 'north-american-nebula-thumb-cropped',
      product: 'Metal print', size: '20 × 17 inches (landscape)', material: 'Glossy photo print on aluminum backing', frame: 'Wall mount included',
      priceCents: 15995, stripePriceIds: { test: 'price_1UY8PmE9TNuvn9mCd1e1vP4L' }, sourceApproved: true,
      cropPreview: { src: '/images/prints/north-american-nebula-20x17-adjusted-20261028.webp', approved: true, revision: '20261028-user-adjusted-v1' },
      cropDescription: 'The approved 20 × 17-inch crop with no white border.', enabled: true,
    },
  ],
  // Variant shape:
  // { id, photographId, product, size, material, frame, priceCents,
  //   cropDescription, enabled: true }
};
