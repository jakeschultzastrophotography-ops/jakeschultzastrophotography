import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Instagram, Facebook, Tag, Copy, Check, ExternalLink, X } from "lucide-react";

/* =======================
   STRIPE CONFIG
======================= */
const STRIPE_BUY_BUTTON_ID = "buy_btn_1SkaTJE9TNuvn9mCwYxOtv99";
const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51SFpezE9TNuvn9mCbukBPixqs1umQmlGWg2LzpKDqtFcYH43yOobTRY3SrtsE51W8FkmwJbW3RVD3Qeh6OWaum8z008TV5572C";

/* =======================
   PROMO
======================= */
const PROMO_CODE = "ASTRO2026";
const PROMO_TEXT = "15% off when you order 3+ calendars";
const PROMO_SUBTEXT = "Use code ASTRO2026 at checkout";

/* =======================
   PATHS (PUBLIC FOLDER)
   IMPORTANT: use BASE_URL for Netlify/mobile safety
======================= */
const withBase = (p) => `${import.meta.env.BASE_URL}${p.replace(/^\/+/, "")}`;

// Your confirmed locations:
const HERO_IMAGE_SRC = withBase("images/gallery/hero/hero.jpg");
const CALENDAR_AD_SRC = withBase("images/gallery/calendar/calendar-ad.jpg");

/* =======================
   ASTROBIN LINKS
======================= */
const ASTROBIN_DEFAULT = "https://app.astrobin.com/u/Astro_jake#gallery";

const ASTROBIN_BY_FILE = {
  "pacman-nebula.jpg": "https://app.astrobin.com/u/Astro_jake?i=0petis#gallery",
  "M31-andromeda-galaxy.jpg": "https://app.astrobin.com/u/Astro_jake?i=fp9yxy#gallery",
  "eastern-veil-nebula.jpg": "https://app.astrobin.com/u/Astro_jake?i=ckddjp#gallery",
  "pelican-nebula.jpg": "https://app.astrobin.com/u/Astro_jake?i=rfg4iu#gallery",
  "crescent-nebula.jpg": "https://app.astrobin.com/u/Astro_jake?i=9qpq1s#gallery",
  "rosette-nebula.jpg": "https://app.astrobin.com/u/Astro_jake?i=ql9o7q#gallery",
  "M42-orion-nebula.jpg": "https://app.astrobin.com/u/Astro_jake?i=v04416#gallery",
  "Flame-and-horsehead-nebula.jpg": "https://app.astrobin.com/u/Astro_jake?i=7xwtsy#gallery",
  "Comet-C2023-A3-(Tsuchinshan–ATLAS).jpg": "https://app.astrobin.com/u/Astro_jake?i=gua7l8#gallery",
  "M3-star-cluster.jpg": "https://app.astrobin.com/u/Astro_jake?i=oywabk#gallery",
  "north-american-nebula.jpg": "https://app.astrobin.com/u/Astro_jake?i=00hw50#gallery",
  "M33-Triangulum-Galaxy.jpg": "https://app.astrobin.com/u/Astro_jake?i=s2kavm#gallery",
  "auroras.jpg": "https://app.astrobin.com/u/Astro_jake?i=7v0n71#gallery",
  "moon-2.png": "https://app.astrobin.com/u/Astro_jake?i=tecn9s#gallery",
  "California-nebula.jpg": "https://app.astrobin.com/u/Astro_jake?i=kep4o2#gallery",
  "milky-way-at-jubilee.jpg": "https://app.astrobin.com/u/Astro_jake?i=jomm01#gallery",
  "cygnus-loop.jpg": "https://app.astrobin.com/u/Astro_jake?i=iuprk1#gallery",
  "moon-1.png": "https://app.astrobin.com/u/Astro_jake?i=52ev9v#gallery",
  "venus-and-crescent-moon.jpg": "https://app.astrobin.com/u/Astro_jake?i=nbzfce#gallery",
  "harvest-moon.jpg": "https://app.astrobin.com/u/Astro_jake?i=3ntchk#gallery",
};

const getAstrobinLink = (file) => ASTROBIN_BY_FILE[file] || ASTROBIN_DEFAULT;

/* =======================
   GALLERY — ALL FILES (NO FOLDERS)
   These must match EXACTLY what is in:
   public/images/gallery/
======================= */
const GALLERY_FILES = [
  "auroras.jpg",
  "auroras-at-jubilee-observatory.jpg",
  "California-nebula.jpg",
  "Comet-C2023-A3-(Tsuchinshan–ATLAS).jpg",
  "cygnus-loop.jpg",
  "eastern-veil-nebula.jpg",
  "Flame-and-horsehead-nebula.jpg",
  "harvest-moon.jpg",
  "M3-star-cluster.jpg",
  "M31-andromeda-galaxy.jpg",
  "M33-Triangulum-Galaxy.jpg",
  "M42-orion-nebula.jpg",
  "M45-pleiades.jpg",
  "milky-way-at-jubilee.jpg",
  "moon-1.png",
  "moon-2.png",
  "north-american-nebula.jpg",
  "pacman-nebula.jpg",
  "pelican-nebula.jpg",
  "rosette-nebula.jpg",
  "totality.jpg",
  "venus-and-crescent-moon.jpg",
];

/* =======================
   HELPERS
======================= */
function titleFromFilename(file) {
  const base = file.replace(/\.(jpg|jpeg|png|webp)$/i, "");
  const spaced = base.replace(/[-_]/g, " ");
  return spaced
    .replace(/\bm31\b/gi, "M31")
    .replace(/\bm33\b/gi, "M33")
    .replace(/\bm42\b/gi, "M42")
    .replace(/\bm45\b/gi, "M45")
    .replace(/\bm3\b/gi, "M3")
    .replace(/\bc2023\b/gi, "C/2023")
    .replace(/\s+/g, " ")
    .trim();
}

/* =======================
   STRIPE BUY BUTTON
======================= */
function StripeBuyButton() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const existing = document.querySelector(
      'script[src="https://js.stripe.com/v3/buy-button.js"]'
    );
    if (existing) {
      setReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/buy-button.js";
    script.async = true;
    script.onload = () => setReady(true);
    script.onerror = () => setReady(false);
    document.body.appendChild(script);
  }, []);

  if (!ready) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        Loading secure checkout…
      </div>
    );
  }

  return (
    <stripe-buy-button
      buy-button-id={STRIPE_BUY_BUTTON_ID}
      publishable-key={STRIPE_PUBLISHABLE_KEY}
    />
  );
}

/* =======================
   LIGHTBOX (CLICK TO ENLARGE)
======================= */
function Lightbox({ open, src, alt, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className="relative w-full max-w-6xl"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
            >
              <X size={16} />
              Close
            </button>

            <img
              src={src}
              alt={alt}
              className="w-full max-h-[85vh] object-contain rounded-xl border border-white/10 bg-black"
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* =======================
   IMAGE CARD (prevents gallery collapse on error)
======================= */
function GalleryCard({ img }) {
  const [failed, setFailed] = useState(false);

  return (
    <a
      href={img.link}
      target="_blank"
      rel="noreferrer"
      className="group relative overflow-hidden rounded-lg bg-white/5 border border-white/10"
      title={`Open on AstroBin: ${img.title}`}
    >
      <div className="w-full h-56 bg-black/30">
        {!failed ? (
          <img
            src={img.src}
            alt={img.title}
            className="w-full h-56 object-cover transition group-hover:scale-105"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="w-full h-56 flex items-center justify-center text-xs text-white/50 px-4 text-center">
            Image not found on deploy:
            <br />
            <span className="text-white/70">{img.src}</span>
          </div>
        )}
      </div>

      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-end p-4">
        <div className="flex items-center gap-2 text-sm">
          {img.title}
          <ExternalLink size={14} />
        </div>
      </div>
    </a>
  );
}

/* =======================
   MAIN SITE
======================= */
export default function AstrophotographySite() {
  const [copied, setCopied] = useState(false);
  const [adOpen, setAdOpen] = useState(false);

  const galleryImages = useMemo(
    () =>
      GALLERY_FILES.map((file) => ({
        file,
        // BASE_URL-safe:
        src: withBase(`images/gallery/${file}`),
        title: titleFromFilename(file),
        link: getAstrobinLink(file),
      })),
    []
  );

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(PROMO_CODE);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = PROMO_CODE;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* NAV */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="text-lg font-semibold">Jake Schultz Astrophotography</div>
        <div className="flex items-center gap-4">
          <a href="#gallery" className="hover:text-white/80">
            Gallery
          </a>
          <a href="#calendar" className="hover:text-white/80">
            Calendar
          </a>
          <a
            href="https://instagram.com/jakeschultzastrophotography"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="hover:text-white/80"
          >
            <Instagram size={18} />
          </a>
          <a
            href="https://facebook.com/jakeschultzastrophotography"
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook"
            className="hover:text-white/80"
          >
            <Facebook size={18} />
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto mt-10 px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="p-8 md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/80">
                <span className="inline-block h-2 w-2 rounded-full bg-white/50" />
                Deep-sky astrophotography
              </div>

              <h1 className="mt-4 text-4xl md:text-5xl font-extrabold leading-tight">
                Deep-sky
                <br />
                astrophotography
              </h1>

              <p className="mt-4 text-white/70 max-w-md">
                Explore the gallery and grab the 2026 calendar featuring deep-sky objects and
                nightscapes.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#gallery"
                  className="inline-flex items-center justify-center rounded-xl bg-white text-black px-5 py-2.5 text-sm font-semibold hover:bg-white/90"
                >
                  View gallery
                </a>
                <a
                  href="#calendar"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                >
                  View calendar
                </a>
              </div>
            </div>

            <div className="relative min-h-[260px] md:min-h-[420px] bg-black">
              <img
                src={HERO_IMAGE_SRC}
                alt="Jake Schultz Astrophotography hero"
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-black/10 via-black/30 to-black/60" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* CALENDAR */}
      <section id="calendar" className="max-w-4xl mx-auto mt-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5 }}
          className="rounded-xl bg-white/5 p-8 text-center"
        >
          <h2 className="text-3xl font-bold">2026 Astrophotography Calendar</h2>
          <p className="mt-2 text-white/70">
            A full-year calendar featuring deep-sky objects and nightscapes.
          </p>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => setAdOpen(true)}
              className="group mx-auto block w-full max-w-3xl"
              aria-label="Click to enlarge calendar preview"
            >
              <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                <img
                  src={CALENDAR_AD_SRC}
                  alt="2026 Astrophotography Calendar preview"
                  className="w-full max-h-[360px] object-contain rounded-xl"
                  loading="lazy"
                />
              </div>
              <div className="mt-2 text-xs text-white/50 group-hover:text-white/70">
                Click to enlarge
              </div>
            </button>
          </div>

          <div className="mt-8 flex justify-center">
            <StripeBuyButton />
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-black/30 p-4">
            <div className="flex justify-center items-center gap-2 text-sm font-semibold">
              <Tag size={16} />
              {PROMO_TEXT}
            </div>
            <div className="mt-1 text-sm text-white/70">{PROMO_SUBTEXT}</div>

            <button
              onClick={copyCode}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {PROMO_CODE}
            </button>
          </div>
        </motion.div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="max-w-6xl mx-auto mt-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-semibold mb-6">Gallery</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {galleryImages.map((img) => (
              <GalleryCard key={img.file} img={img} />
            ))}
          </div>
        </motion.div>
      </section>

      <footer className="mt-24 py-6 text-center text-sm text-white/50">
        © 2026 Jake Schultz Astrophotography
      </footer>

      <Lightbox
        open={adOpen}
        src={CALENDAR_AD_SRC}
        alt="2026 Astrophotography Calendar preview enlarged"
        onClose={() => setAdOpen(false)}
      />
    </div>
  );
}