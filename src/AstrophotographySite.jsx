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
 * FIXES INCLUDED:
 * 1) ShareBar ALWAYS shares ABSOLUTE URLs (Facebook needs absolute).
 * 2) Latest News "Eclipse lockscreen" uses a PHONE LOCKSCREEN SAMPLE image
 *    (so the feed shows a real lockscreen preview, not the raw wallpaper file):
 *    /share/eclipse-lockscreen/Totality Lock Screen.jpg
 * 3) Phone Background downloads list REMOVES lockscreen file (post-only),
 *    so it does not show in download grid.
 * 4) Extra safety: heroFallback for broken media remains.
 */

// ✅ Latest News uses a lockscreen *sample* image (screenshot-style preview)
// NOTE: this is separate from the downloadable wallpaper files on /phone-backgrounds
const LOCKSCREEN_PREVIEW_SRC =
  "/share/eclipse-lockscreen/Totality Lock Screen.jpg";

// ✅ Share pages (must exist as static OG pages in /public/share/...)
// ShareBar will make these absolute automatically.
const LATEST_NEWS = [
  {
    id: "markarians-chain",
    title: "Markarian's Chain — Virgo Cluster",
    date: "Feb 18, 2026",
    image: "/images/gallery/markarians-chain.jpg",
    href: "https://app.astrobin.com/uploader",
    external: true,
    shareHref: "/share/markarians-chain/",
    description:
      "Captured last night with ~1 hour total integration using 180‑second exposures, this field reveals the heart of Markarian’s Chain in the Virgo Cluster. Dominating the center are the massive elliptical galaxies M84 and M86, while the interacting pair NGC 4435 and NGC 4438 — known as ‘The Eyes’ — appear nearby. Numerous additional spirals and ellipticals populate the frame, each a distant island universe tens of millions of light‑years away.",
    cta: "View on AstroBin",
    mediaFit: "contain",
  },
  {
    id: "eclipse-lockscreen",
    title: "Total Solar Eclipse — Lock Screen Edition",
    date: "Feb 13, 2026",
    image: LOCKSCREEN_PREVIEW_SRC,
    href: "/phone-backgrounds",
    external: false,
    shareHref: "/share/eclipse-lockscreen/",
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
    shareHref: "/share/orion-nebula/",
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
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
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

// ... rest of your file remains unchanged ...
