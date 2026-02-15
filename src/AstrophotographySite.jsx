import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Instagram,
  Facebook,
  Camera,
  ChevronLeft,
  Download,
  ShoppingBag,
  Image as ImageIcon,
  ExternalLink,
  Share2,
  Link as LinkIcon,
  MessageCircle,
} from "lucide-react";

const STRIPE_BUY_BUTTON_ID = "buy_btn_1SkaTJE9TNuvn9mCwYxOtv99";
const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51SFpezE9TNuvn9mCbukBPixqs1umQmlGWg2LzpKDqtFcYH43yOobTRY3SrtsE51W8FkmwJbW3RVD3Qeh6OWaum8z008TV5572C";

const CALENDAR_AD_SRC = "/images/gallery/calendar/calendar-ad.jpg";

// ✅ Use your live wallpaper subdomain for OG share pages
const SHARE_BASE = "https://wallpapers.jakeschultzastrophotography.com";

/**
 * ✅ Latest News — vertical/social feed style
 * ✅ Share links point to static OG pages so Facebook shows image cards
 */
const LATEST_NEWS = [
  {
    id: "eclipse-lockscreen",
    title: "Total Solar Eclipse — Lock Screen Edition",
    date: "Feb 13, 2026",
    image: "/images/wallpapers/backgrounds/Totality Lock Screen.jpg",
    href: "/phone-backgrounds",
    external: false,
    // ✅ ABSOLUTE
    shareHref: `${SHARE_BASE}/share/eclipse-lockscreen/`,
    description:
      "New free phone wallpaper drop — optimized for lock screens. Click to view and download.",
    cta: "View & Download",
    mediaFit: "contain",
  },
  {
    id: "orion-nebula",
    title: "Orion Nebula (M42)",
    date: "Jan 2, 2026",
    image: "/images/gallery/Orion-Nebula2.jpg",
    href: "https://app.astrobin.com/u/Astro_jake?i=zsffpr#gallery",
    external: true,
    // ✅ ABSOLUTE (make sure you created /public/share/orion-nebula/index.html)
    shareHref: `${SHARE_BASE}/share/orion-nebula/`,
    description:
      "Posted Jan 2, 2026 — Deep-sky capture processed for structure, contrast, and balanced color. Click to view on AstroBin.",
    cta: "View on AstroBin",
    mediaFit: "contain",
  },
];

function usePathname() {
  const getPath = () => {
    const raw = window.location.pathname || "/";
    const clean = raw.replace(/\/+$/, "") || "/";
    return clean === "" ? "/" : clean;
  };

  const [path, setPath] = useState(() =>
    typeof window === "undefined" ? "/" : getPath()
  );

  useEffect(() => {
    const onPop = () => setPath(getPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (to) => {
    const next = (to || "/").replace(/\/+$/, "") || "/";
    if (next === path) return;
    window.history.pushState({}, "", next);
    setPath(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return { path, navigate };
}

function StripeBuyButton({ buyButtonId, publishableKey }) {
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
    script.async = true;
    script.src = "https://js.stripe.com/v3/buy-button.js";
    script.onload = () => setReady(true);
    script.onerror = () => setReady(false);
    document.body.appendChild(script);
  }, []);

  if (!buyButtonId || !publishableKey) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
        Stripe is not configured yet.
      </div>
    );
  }

  return (
    <div className="min-h-[60px]">
      {!ready ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Loading secure checkout…
        </div>
      ) : (
        <stripe-buy-button
          buy-button-id={buyButtonId}
          publishable-key={publishableKey}
        ></stripe-buy-button>
      )}
    </div>
  );
}

function NavButton({ onClick, children, className = "", title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 ${className}`}
    >
      {children}
    </button>
  );
}

/* ============================
   Share helpers
============================ */

function getAbsoluteUrl(href) {
  try {
    if (!href) return window.location.href;
    if (href.startsWith("http")) return href;
    return new URL(href, window.location.origin).toString();
  } catch {
    return href;
  }
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

function ShareBar({ title, shareHref, text }) {
  const [copied, setCopied] = useState(false);

  const url = useMemo(() => getAbsoluteUrl(shareHref), [shareHref]);
  const shareText = text || title;

  const onNativeShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, text: shareText, url });
    } catch {
      // cancelled / unsupported
    }
  };

  const onCopy = async () => {
    const ok = await copyToClipboard(url);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 1600);
  };

  const fbShareUrl = useMemo(() => {
    const u = encodeURIComponent(url);
    return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
  }, [url]);

  const smsShareUrl = useMemo(() => {
    const body = encodeURIComponent(`${shareText} ${url}`);
    return `sms:?&body=${body}`;
  }, [shareText, url]);

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onNativeShare}
        disabled={!navigator.share}
        className={`inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/10 ${
          navigator.share
            ? "bg-white/5"
            : "bg-white/5 opacity-50 cursor-not-allowed"
        }`}
        title={navigator.share ? "Share" : "Share not supported on this device"}
      >
        <Share2 className="h-4 w-4" />
        Share
      </button>

      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
        title="Copy link"
      >
        <LinkIcon className="h-4 w-4" />
        {copied ? "Copied" : "Copy link"}
      </button>

      <a
        href={fbShareUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
        title="Share to Facebook"
      >
        <Facebook className="h-4 w-4" />
        Facebook
      </a>

      <a
        href={smsShareUrl}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
        title="Share via text message"
      >
        <MessageCircle className="h-4 w-4" />
        Text
      </a>
    </div>
  );
}

function HomePage({ sectionScrollMargin, heroFallback, navigate }) {
  const year = new Date().getFullYear();
  const heroSrc = "/images/gallery/hero/hero.jpg";

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
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=07i1mm#gallery",
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
        src: "/images/gallery/Comet-C2023-A3-(Tsuchinshan-ATLAS)v2.jpg",
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
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=ro5i8r#gallery",
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
        astrobin: "https://app.astrobin.com/u/Astro_jake?i=jikvvk#gallery",
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
    <>
      {/* HERO */}
      <section
        id="top"
        className={`mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pt-14 ${sectionScrollMargin}`}
      >
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-2xl font-semibold leading-tight sm:text-5xl"
            >
              Deep-sky images and nightscapes, built for the wall.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="mt-4 max-w-xl text-white/75"
            >
              Explore the gallery, then grab the 2026 astrophotography calendar
              through secure Stripe checkout.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
            >
              <a
                href="#gallery"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-white/90 sm:w-auto"
              >
                <ImageIcon className="h-4 w-4" />
                View gallery
              </a>

              <a
                href="#calendar"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 sm:w-auto"
              >
                <ShoppingBag className="h-4 w-4" />
                Buy the calendar
              </a>
            </motion.div>

            <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/60">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Peoria, Illinois
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Deep-sky & nightscapes
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                Print-ready processing
              </span>
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
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
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

      {/* CALENDAR PROMO */}
      <section
        id="calendar"
        className={`mx-auto max-w-6xl px-4 pb-10 sm:px-6 ${sectionScrollMargin}`}
      >
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                2026 Astrophotography Calendar
              </h2>
              <p className="mt-1 text-sm text-white/70">
                Secure Stripe checkout.
              </p>
            </div>
            <a
              href="#gallery"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10 sm:mt-0 sm:w-auto"
            >
              <ImageIcon className="h-4 w-4" />
              View gallery
            </a>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            {/* Calendar ad image (NO CROPPING) */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-3 sm:p-4">
              <div className="relative w-full overflow-hidden rounded-xl bg-black/40">
                <div className="h-[260px] sm:h-[360px] lg:h-[420px]">
                  <img
                    src={CALENDAR_AD_SRC}
                    alt="2026 Astrophotography Calendar ad"
                    className="h-full w-full object-contain"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Buy button */}
            <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
              <div className="text-sm font-semibold">Buy now</div>
              <div className="mt-3">
                <StripeBuyButton
                  buyButtonId={STRIPE_BUY_BUTTON_ID}
                  publishableKey={STRIPE_PUBLISHABLE_KEY}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LATEST NEWS FEED */}
      <section
        className={`mx-auto max-w-6xl px-4 pb-10 sm:px-6 ${sectionScrollMargin}`}
      >
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Latest News</h2>
              <p className="mt-1 text-sm text-white/70">
                New releases, free downloads, and shareable posts.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-10">
            {LATEST_NEWS.map((post) => {
              const isExternal = !!post.external;
              const mediaFit =
                post.mediaFit === "cover" ? "object-cover" : "object-contain";

              const openPost = () => {
                if (isExternal) {
                  window.open(post.href, "_blank", "noreferrer");
                } else {
                  navigate(post.href);
                }
              };

              return (
                <div key={post.id} className="mx-auto w-full max-w-2xl">
                  {/* Post header */}
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        Jake Schultz Astrophotography
                      </div>
                      <div className="text-xs text-white/60">
                        Posted {post.date}
                      </div>
                    </div>
                    <div className="text-xs text-white/60">
                      {isExternal ? "AstroBin" : "Free wallpaper"}
                    </div>
                  </div>

                  {/* Media */}
                  <button
                    type="button"
                    onClick={openPost}
                    className="block w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30 text-left"
                    title={post.title}
                  >
                    <div className="w-full bg-black/40">
                      <img
                        src={post.image}
                        alt={post.title}
                        className={`w-full h-auto ${mediaFit}`}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.src = heroFallback;
                        }}
                      />
                    </div>
                  </button>

                  {/* Caption */}
                  <div className="mt-4">
                    <div className="text-lg font-semibold">{post.title}</div>
                    <p className="mt-2 text-white/75">{post.description}</p>

                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      {isExternal ? (
                        <a
                          href={post.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
                        >
                          {post.cta}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(post.href)}
                          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
                        >
                          {post.cta}
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* ✅ Share uses absolute shareHref */}
                    <ShareBar
                      title={post.title}
                      shareHref={post.shareHref}
                      text={post.description}
                    />
                  </div>

                  <div className="mt-8 border-t border-white/10" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section
        id="gallery"
        className={`mx-auto max-w-6xl px-4 py-10 sm:px-6 ${sectionScrollMargin}`}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Gallery</h2>
            <p className="mt-1 text-sm text-white/70">
              Click any image to view it on AstroBin.
            </p>
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
                  loading="lazy"
                  decoding="async"
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

      <footer className="border-t border-white/10 bg-black/40 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-white/60 sm:px-6">
          © {year} Jake Schultz Astrophotography. All rights reserved.
        </div>
      </footer>
    </>
  );
}

function PhoneBackgroundsPage({ heroFallback }) {
  const year = new Date().getFullYear();

  // Put wallpapers in: public/images/wallpapers/backgrounds/
  // ✅ REMOVED: "Totality Lock Screen.jpg" (share-only)
  const wallpaperFiles = useMemo(
    () => [
      "Orion Nebula.png",
      "Eastern Veil.png",
      "Pelican Nebula.png",
      "Crescent Nebula.png",
      "Totality2.jpg",
      "M31.jpg",
      "M45.jpg",
      "Totality.png",
      "M33.jpg",
      "California Nebula.jpg",
      "Lightning.jpg",
      "M42.jpg",
      "Rosette.jpg",
      "Andromeda.jpg",
      "Heart Nebula.jpg",
      "Moon.png",
      "Horsehead.jpg",
      // "Totality Lock Screen.jpg", // <-- removed from downloads
    ],
    []
  );

  const wallpapers = useMemo(
    () =>
      wallpaperFiles.map((file) => ({
        file,
        title: file.replace(/\.[^/.]+$/, ""),
        src: `/images/wallpapers/backgrounds/${file}`,
      })),
    [wallpaperFiles]
  );

  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return wallpapers;
    return wallpapers.filter((w) => w.title.toLowerCase().includes(q));
  }, [query, wallpapers]);

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pt-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold sm:text-4xl">
                Phone Backgrounds
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/75">
                Free wallpapers. Tap Download to save the original file, then
                set it as your phone wallpaper.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="w-full sm:w-56 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
            <div className="font-semibold text-white/85">Quick tips</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>After downloading, your phone will let you crop/zoom.</li>
              <li>Personal use is fine. For commercial use, contact me.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w) => {
            const safeName = w.file.replace(/\s+/g, "-");
            return (
              <div
                key={w.file}
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/5"
              >
                <div className="relative bg-black/30 p-4">
                  <div className="mx-auto w-full max-w-[320px]">
                    <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-black/40 shadow-2xl">
                      <div className="aspect-[9/19.5]">
                        <img
                          src={w.src}
                          alt={w.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                          onError={(e) => {
                            e.currentTarget.src = heroFallback;
                          }}
                        />
                      </div>
                      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-base font-semibold">{w.title}</div>

                    <div className="mt-4 flex flex-col gap-2">
                      <a
                        href={w.src}
                        download={safeName}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
                        title="Download wallpaper"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>

                      <a
                        href={w.src}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15"
                        title="Open full resolution"
                      >
                        View full size
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/40 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-white/60 sm:px-6">
          © {year} Jake Schultz Astrophotography. All rights reserved.
        </div>
      </footer>
    </>
  );
}

export default function AstrophotographySite() {
  const sectionScrollMargin = "scroll-mt-28 sm:scroll-mt-32";
  const heroFallback = "/images/gallery/M31-andromeda-galaxy.jpg";

  const { path, navigate } = usePathname();
  const onHome = path === "/";
  const onWallpapers = path === "/phone-backgrounds";

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.06),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.05),transparent_45%)]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 font-semibold tracking-wide"
            title="Go to Home"
          >
            <Camera className="h-5 w-5" />
            <span>Jake Schultz Astrophotography</span>
          </button>

          <div className="flex items-center gap-2">
            {onWallpapers ? (
              <NavButton
                onClick={() => navigate("/")}
                className="hidden sm:inline-flex"
                title="Back to Home"
              >
                <ChevronLeft className="h-4 w-4" />
                Home
              </NavButton>
            ) : (
              <>
                <a
                  href="#calendar"
                  className="ml-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
                  title="Jump to Calendar"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Calendar
                </a>

                <a
                  href="#gallery"
                  className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
                  title="Jump to Gallery"
                >
                  <ImageIcon className="h-4 w-4" />
                  Gallery
                </a>
              </>
            )}

            <button
              type="button"
              onClick={() => navigate("/phone-backgrounds")}
              className={`hidden sm:inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium hover:bg-white/10 ${
                onWallpapers ? "bg-white/15" : "bg-white/5"
              }`}
              title="Phone Backgrounds"
            >
              <Download className="h-4 w-4" />
              Phone Backgrounds
            </button>

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
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-3 sm:hidden">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate("/phone-backgrounds")}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium hover:bg-white/10 ${
                onWallpapers ? "bg-white/15" : "bg-white/5"
              }`}
            >
              <Download className="h-4 w-4" />
              Phone Backgrounds
            </button>
            {onWallpapers ? (
              <button
                type="button"
                onClick={() => navigate("/")}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
                Home
              </button>
            ) : (
              <a
                href="#calendar"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"
              >
                <ShoppingBag className="h-4 w-4" />
                Calendar
              </a>
            )}
          </div>
        </div>
      </header>

      {onHome ? (
        <HomePage
          sectionScrollMargin={sectionScrollMargin}
          heroFallback={heroFallback}
          navigate={navigate}
        />
      ) : onWallpapers ? (
        <PhoneBackgroundsPage heroFallback={heroFallback} />
      ) : (
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="text-2xl font-semibold">Page not found</div>
            <p className="mt-2 text-sm text-white/70">
              The page “{path}” doesn’t exist.
            </p>
            <div className="mt-5">
              <NavButton onClick={() => navigate("/")}>Go to Home</NavButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
