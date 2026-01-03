import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Instagram, Facebook, Camera, ShoppingBag, Image as ImageIcon, ExternalLink } from "lucide-react";

const navLinks = [
  { label: "Gallery", href: "#gallery" },
  { label: "Calendar", href: "#calendar" },
];

// Your Stripe Buy Button config (calendar)
const STRIPE_BUY_BUTTON_ID = "buy_btn_1SkaTJE9TNuvn9mCwYxOtv99";
const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51SFpezE9TNuvn9mCbukBPixqs1umQmlGWg2LzpKDqtFcYH43yOobTRY3SrtsE51W8FkmwJbW3RVD3Qeh6OWaum8z008TV5572C";

function StripeBuyButton({ buyButtonId, publishableKey }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const existing = document.querySelector('script[src="https://js.stripe.com/v3/buy-button.js"]');
    if (existing) {
      setReady(true);
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://js.stripe.com/v3/buy-button.js";
    script.onload = () => setReady(true);
    script.onerror = () => setReady(false);
    document.body.appendChild(script);
  }, []);

  if (!buyButtonId || !publishableKey) {
    return <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">Stripe is not configured yet.</div>;
  }

  return (
    <div className="min-h-[60px]">
      {!ready ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">Loading secure checkout…</div>
      ) : (
        <stripe-buy-button buy-button-id={buyButtonId} publishable-key={publishableKey}></stripe-buy-button>
      )}
    </div>
  );
}

export default function AstrophotographySite() {
  const year = new Date().getFullYear();

  // HERO image (put your hero in: public/images/gallery/hero/hero.jpg)
  const heroSrc = "/images/gallery/hero/hero.jpg";
  const heroFallback = "/images/gallery/M31-andromeda-galaxy.jpg";

  // Gallery images from your folder: public/images/gallery/
  // Each item includes an AstroBin link. Clicking a card opens that link.
  const gallery = useMemo(
    () => [
      {
        title: "Andromeda Galaxy (M31)",
        src: "/images/gallery/M31-andromeda-galaxy.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=fp9yxy#gallery",
      },
      {
        title: "Triangulum Galaxy (M33)",
        src: "/images/gallery/M33-Triangulum-Galaxy.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=s2kavm#gallery",
      },
      {
        title: "Orion Nebula (M42)",
        src: "/images/gallery/M42-orion-nebula.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=v04416#gallery",
      },
      {
        title: "Pleiades (M45)",
        src: "/images/gallery/M45-pleiades.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake#gallery",
      },
      {
        title: "M3 Star Cluster",
        src: "/images/gallery/M3-star-cluster.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=oywabk#gallery",
      },
      {
        title: "Crescent Nebula",
        src: "/images/gallery/crescent-nebula.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=9qpq1s#gallery",
      },
      {
        title: "Cygnus Loop",
        src: "/images/gallery/cygnus-loop.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=iuprk1#gallery",
      },
      {
        title: "Eastern Veil Nebula",
        src: "/images/gallery/eastern-veil-nebula.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=ckddjp#gallery",
      },
      {
        title: "Flame + Horsehead",
        src: "/images/gallery/Flame-and-horsehead-nebula.jpg",
        // FIXED HORSEHEAD LINK:
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=7xwtsy#gallery",
      },
      {
        title: "North America Nebula",
        src: "/images/gallery/north-american-nebula.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=00hw50#gallery",
      },
      {
        title: "Pacman Nebula",
        src: "/images/gallery/pacman-nebula.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=0petis#gallery",
      },
      {
        title: "Pelican Nebula",
        src: "/images/gallery/pelican-nebula.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=rfg4iu#gallery",
      },
      {
        title: "Rosette Nebula",
        src: "/images/gallery/rosette-nebula.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=ql9o7q#gallery",
      },
      {
        title: "California Nebula",
        src: "/images/gallery/California-nebula.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=kep4o2#gallery",
      },
      {
        title: "Comet C/2023 A3 (Tsuchinshan–ATLAS)",
        src: "/images/gallery/Comet-C2023-A3-(Tsuchinshan–ATLAS).jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=gua7l8#gallery",
      },
      {
        title: "Milky Way (Jubilee)",
        src: "/images/gallery/milky-way-at-jubilee.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=jomm01#gallery",
      },
      {
        title: "Auroras",
        src: "/images/gallery/auroras.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=7v0n71#gallery",
      },
      {
        title: "Auroras (Jubilee)",
        src: "/images/gallery/auroras-at-jubilee-observatory.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=7v0n71#gallery",
      },
      {
        title: "Harvest Moon",
        src: "/images/gallery/harvest-moon.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=3ntchk#gallery",
      },
      {
        title: "Venus + Crescent Moon",
        src: "/images/gallery/venus-and-crescent-moon.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=nbzfce#gallery",
      },
      {
        title: "Totality",
        src: "/images/gallery/totality.jpg",
        astrobin: "https://app.astrobin.com/u/Astro_jake#gallery",
      },
      {
        title: "Moon (1)",
        src: "/images/gallery/moon-1.png",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=52ev9v#gallery",
      },
      {
        title: "Moon (2)",
        src: "/images/gallery/moon-2.png",
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=tecn9s#gallery",
      },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Subtle background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.06),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.05),transparent_45%)]" />
      </div>

      {/* NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="#top" className="flex items-center gap-2 font-semibold tracking-wide">
            <Camera className="h-5 w-5" />
            <span>Jake Schultz Astrophotography</span>
          </a>

          <nav className="hidden items-center gap-6 text-sm text-white/80 md:flex">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="https://www.instagram.com/jakeschultzastrophotography"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/10 bg-white/5 p-2 hover:bg-white/10"
              aria-label="Instagram"
              title="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>

            <a
              href="https://www.facebook.com/jakeschultzastrophotography"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/10 bg-white/5 p-2 hover:bg-white/10"
              aria-label="Facebook"
              title="Facebook"
            >
              <Facebook className="h-4 w-4" />
            </a>

            <a
              href="#calendar"
              className="ml-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
            >
              <ShoppingBag className="h-4 w-4" />
              Calendar
            </a>
          </div>
        </div>

        {/* Mobile links */}
        <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
          <div className="flex flex-wrap gap-3 text-sm text-white/80">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-white">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pt-14">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-3xl font-semibold leading-tight sm:text-5xl"
            >
              Deep-sky images and nightscapes, built for the wall.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-4 max-w-xl text-white/75"
            >
              Browse the gallery, then grab the 2026 calendar through secure Stripe checkout.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 flex flex-wrap gap-3"
            >
              <a
                href="#gallery"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90"
              >
                <ImageIcon className="h-4 w-4" />
                View gallery
              </a>

              <a
                href="#calendar"
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                <ShoppingBag className="h-4 w-4" />
                Buy the calendar
              </a>
            </motion.div>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/60">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Peoria, Illinois</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Deep-sky & nightscapes</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Print-ready processing</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="overflow-hidden rounded-[2.25rem] border border-white/10 bg-white/5 shadow-2xl">
              <div className="aspect-[4/3]">
                <img
                  alt="Featured astrophotography"
                  className="h-full w-full object-cover"
                  src={heroSrc}
                  onError={(e) => {
                    e.currentTarget.src = heroFallback;
                  }}
                />
              </div>
            </div>

            <div className="pointer-events-none absolute -bottom-10 -left-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          </motion.div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Gallery</h2>
            <p className="mt-1 text-sm text-white/70">Click any image to view it on AstroBin.</p>
          </div>

          <a
            href="#calendar"
            className="hidden rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 sm:inline-flex"
          >
            Calendar
          </a>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((item) => (
            <motion.a
              key={item.title}
              href={item.astrobin}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35 }}
              className="group block overflow-hidden rounded-2xl border border-white/10 bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/30"
              title={`Open on AstroBin: ${item.title}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={item.src}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  onError={(e) => {
                    e.currentTarget.src = heroFallback;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-90" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="text-base font-semibold">{item.title}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-white/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>View on AstroBin →</span>
                  </div>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </section>

      {/* CALENDAR (Stripe Buy Button) */}
      <section id="calendar" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-10">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold">2026 Astrophotography Calendar</h2>
            <p className="text-sm text-white/70">
              Full-year calendar featuring deep-sky objects and nightscapes. Secure checkout via Stripe.
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <h3 className="text-lg font-semibold">What you get</h3>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                <li>• 13 months of your astrophotography</li>
                <li>• Clean, print-friendly layout</li>
                <li>• Great gift / wall display</li>
              </ul>
              <div className="mt-5 text-sm text-white/70">For bulk orders, send me a message.</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="text-sm font-semibold">Checkout</div>
              <div className="mt-3">
                <StripeBuyButton buyButtonId={STRIPE_BUY_BUTTON_ID} publishableKey={STRIPE_PUBLISHABLE_KEY} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/40">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-white/60 sm:px-6">
          © {year} Jake Schultz Astrophotography. All rights reserved.
        </div>
      </footer>
    </div>
  );
}