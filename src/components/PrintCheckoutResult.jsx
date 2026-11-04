import { useEffect, useState } from 'react';
export default function PrintCheckoutResult() {
  const [message, setMessage] = useState('Checking your payment…');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('print_checkout') === 'cancelled') return;
    const controller = new AbortController();
    fetch(`/.netlify/functions/print-status?session_id=${encodeURIComponent(params.get('session_id') || '')}`, { signal: controller.signal })
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(); return data; })
      .then(data => setMessage(data.paid ? 'Thank you. Your payment is confirmed. We will arrange production of your print with WhiteWall.' : 'Your payment has not yet been confirmed. Please check your receipt or contact us before paying again.'))
      .catch(e => { if (e.name !== 'AbortError') setMessage('We could not confirm payment right now. Please check your Stripe receipt or contact us before paying again.'); });
    return () => controller.abort();
  }, []);
  const cancelled = new URLSearchParams(window.location.search).get('print_checkout') === 'cancelled';
  return <section className="mx-auto max-w-2xl space-y-5 px-6 py-16"><h1 className="text-3xl font-semibold">{cancelled ? 'Checkout cancelled' : 'Print order'}</h1><p role="status">{cancelled ? 'You left checkout. You can return to the gallery whenever you are ready.' : message}</p><p>Questions about your order? <a className="underline underline-offset-4" href="mailto:jakeschultzastrophotography@gmail.com?subject=Print%20order%20question">Contact Jake</a>.</p><a className="inline-block rounded-full border border-white/30 px-5 py-3" href="/gallery">Return to gallery</a></section>;
}
