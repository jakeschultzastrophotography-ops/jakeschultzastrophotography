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

/**
 * SHARE LINKS NOW USE ABSOLUTE URLS
 */
const LATEST_NEWS = [
  {
    id: "eclipse-lockscreen",
    title: "Total Solar Eclipse — Lock Screen Edition",
    date: "Feb 13, 2026",
    image: "/images/wallpapers/backgrounds/Totality Lock Screen.jpg",
    href: "/phone-backgrounds",
    external: false,
    shareHref:
      "https://wallpapers.jakeschultzastrophotography.com/share/eclipse-lockscreen/",
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
    shareHref:
      "https://wallpapers.jakeschultzastrophotography.com/share/orion-nebula/",
    description:
      "Posted Jan 2, 2026 — Deep-sky capture processed for structure, contrast, and balanced color.",
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
    return null;
  }

  return (
    <div className="min-h-[60px]">
      {!ready ? (
        <div className="text-sm text-white/70">Loading secure checkout…</div>
      ) : (
        <stripe-buy-button
          buy-button-id={buyButtonId}
          publishable-key={publishableKey}
        ></stripe-buy-button>
      )}
    </div>
  );
}

function getAbsoluteUrl(href) {
  try {
    if (href.startsWith("http")) return href;
    return new URL(href, window.location.origin).toString();
  } catch {
    return href;
  }
}

function ShareBar({ title, shareHref, text }) {
  const url = useMemo(() => getAbsoluteUrl(shareHref), [shareHref]);
  const shareText = text || title;

  const fbShareUrl = useMemo(() => {
    const u = encodeURIComponent(url);
    return `https://www.facebook.com/sharer/sharer.php?u=${u}`;
  }, [url]);

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <a
        href={fbShareUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
      >
        <Facebook className="h-4 w-4" /> Facebook
      </a>
    </div>
  );
}

function HomePage({ navigate }) {
  const heroSrc = "/images/gallery/hero/hero.jpg";

  return (
    <section className="mx-auto max-w-6xl px-4 pt-12">
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h1 className="text-5xl font-semibold">
            Deep-sky images and nightscapes, built for the wall.
          </h1>

          <p className="mt-4 text-white/75">
            Explore the gallery, then grab the 2026 astrophotography calendar.
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => navigate("/phone-backgrounds")}
              className="bg-white text-black px-5 py-3 rounded-xl font-semibold"
            >
              Phone Backgrounds
            </button>
          </div>
        </div>

        <img
          src={heroSrc}
          className="rounded-3xl border border-white/10"
        />
      </div>

      {/* Latest News */}
      <div className="mt-16">
        <h2 className="text-2xl font-semibold">Latest News</h2>

        {LATEST_NEWS.map((post) => (
          <div key={post.id} className="mt-8">
            <img src={post.image} className="rounded-xl" />

            <div className="mt-3 text-lg font-semibold">{post.title}</div>

            <ShareBar
              title={post.title}
              shareHref={post.shareHref}
              text={post.description}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function PhoneBackgroundsPage() {
  /**
   * TOTALITY LOCK SCREEN REMOVED FROM DOWNLOAD LIST
   * (still used in Latest News + share pages)
   */
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
    ],
    []
  );

  const wallpapers = wallpaperFiles.map((file) => ({
    title: file.replace(/\.[^/.]+$/, ""),
    src: `/images/wallpapers/backgrounds/${file}`,
  }));

  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold mb-6">Phone Backgrounds</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallpapers.map((w) => (
          <div key={w.src}>
            <img src={w.src} className="rounded-xl" />

            <a
              href={w.src}
              download
              className="block mt-2 bg-white text-black px-4 py-2 rounded-lg text-center"
            >
              Download
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AstrophotographySite() {
  const { path, navigate } = usePathname();

  if (path === "/phone-backgrounds") {
    return <PhoneBackgroundsPage />;
  }

  return <HomePage navigate={navigate} />;
}
