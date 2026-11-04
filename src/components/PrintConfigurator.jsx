import { useEffect, useRef, useState } from 'react';

export default function PrintConfigurator({ photograph, titleId }) {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');
  const [variantId, setVariantId] = useState('');
  const [cropConfirmed, setCropConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/.netlify/functions/print-catalog', { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setCatalog).catch(e => { if (e.name !== 'AbortError') setError('Print options are currently unavailable. Please try again later.'); });
    return () => controller.abort();
  }, []);
  const variants = catalog?.variants?.filter(v => v.photographId === photograph.id) || [];
  const variant = variants.find(v => v.id === variantId);
  const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: catalog.currency }).format(cents / 100);
  async function checkout() {
    if (busy || !variant || !cropConfirmed) return;
    setBusy(true); setError('');
    requestId.current ||= crypto.randomUUID();
    try {
      const response = await fetch('/.netlify/functions/print-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photographId: photograph.id, variantId, quantity: 1, cropConfirmed, requestId: requestId.current }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Checkout is unavailable.');
      const url = new URL(data.url);
      if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Unable to open secure checkout.');
      window.location.assign(url.href);
    } catch (e) { setError(e.message); setBusy(false); }
  }
  return (
    <div className="mt-4 space-y-4">
      <h2 id={titleId} className="text-2xl font-semibold">{photograph.title}</h2>
      <img src={variant?.cropPreview?.src || photograph.src} alt={variant ? `${photograph.title} — approved print crop` : photograph.title} className="max-h-80 w-full rounded-xl object-contain" />
      {!catalog && !error && <p role="status">Loading print options…</p>}
      {catalog && (!catalog.enabled || !variants.length) && <p>Print ordering for this photograph is coming soon.</p>}
      {catalog?.enabled && variants.length > 0 && <>
        <label className="block space-y-2"><span>Choose your print</span>
          <select disabled={busy} value={variantId} onChange={e => { setVariantId(e.target.value); setCropConfirmed(false); requestId.current = null; }} className="w-full rounded-lg border border-white/30 bg-[#10151e] p-3">
            <option value="">Select an option</option>
            {variants.map(v => <option key={v.id} value={v.id}>{v.product} · {v.size} · {v.material} · {v.frame} — {money(v.priceCents)}</option>)}
          </select>
        </label>
        {variant && <>
          <p>Print: {money(variant.priceCents)} · Shipping: {money(catalog.shippingCents)}. Tax, if configured for your location, is calculated at checkout.</p>
          <p className="text-sm text-white/70">Exact approved print crop shown: {variant.cropDescription}</p>
          <label className="flex gap-3"><input type="checkbox" disabled={busy} checked={cropConfirmed} onChange={e => setCropConfirmed(e.target.checked)} />I approve this print option and the crop shown above.</label>
          <p className="text-sm text-white/70">Your print will be ordered from WhiteWall after payment is confirmed.</p>
        </>}
      </>}
      {error && <p role="alert" className="text-amber-200">{error}</p>}
      <button type="button" onClick={checkout} disabled={busy || !variant || !cropConfirmed} className="w-full rounded-xl bg-[#D8C18F] px-4 py-3 font-semibold text-black disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/50">{busy ? 'Opening secure checkout…' : variant ? 'Continue to Stripe checkout' : 'Checkout unavailable'}</button>
    </div>
  );
}
