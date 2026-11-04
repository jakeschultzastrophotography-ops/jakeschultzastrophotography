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
  ],
  // Variant shape:
  // { id, photographId, product, size, material, frame, priceCents,
  //   cropDescription, enabled: true }
};
