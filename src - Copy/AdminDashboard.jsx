import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Upload,
  Palette,
  Type,
  LayoutGrid,
  GripVertical,
  Plus,
  Trash2,
  Undo2,
  Redo2,
  ArrowLeft,
  Smartphone,
  Monitor,
  Search,
  Sparkles,
  Lock,
  Unlock,
  Image as ImageIcon,
  CloudUpload,
  FileDown,
  SlidersHorizontal,
  Camera,
  Compass,
  Target,
} from "lucide-react";

/**
 * AdminDashboard.jsx — v2 (Jake-only Site Builder)
 *
 * Adds (requested):
 * ✅ True drag/resize canvas editor with grid snapping per breakpoint (desktop/mobile)
 * ✅ Image picker (path or upload->dataURL) + style presets
 * ✅ Font picker with presets (Stellarium-ish, Nebula Glass, etc.)
 * ✅ Persistence options:
 *    - LocalStorage (default)
 *    - Export/Import JSON
 *    - Optional Netlify Functions persistence (if you add /netlify/functions)
 *
 * IMPORTANT:
 * This dashboard does NOT expose itself in UI — only by visiting /admin.
 * Wiring your public site to render from config is a separate step; this dashboard
 * produces the config and supports preview so we can wire safely without design changes.
 *
 * Dependencies (for the grid canvas):
 *   npm i react-grid-layout react-resizable
 * And include in your global CSS (or in this file via import) if you don’t already:
 *   import "react-grid-layout/css/styles.css";
 *   import "react-resizable/css/styles.css";
 */

// If you add these CSS imports inside this file, Vite will bundle them fine.
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { Responsive } from "react-grid-layout";


const STORAGE_KEY = "jake_site_builder_v2";
const DEFAULT_SECRET = "saturn"; // change any time

const DEFAULT_CANONICAL = "https://jakeschultzastrophotography.com"; // used for absolute share URLs
const PREVIEW_EVENT = "jake-site-config-updated";
const PREVIEW_CHANNEL = "jake-site-config";
const STREAM_GEAR_OPTIONS = {
  telescopes: ["", "Redcat 51", "Apertura 6\" Astrograph", "Celestron C11", "Other"],
  mounts: ["", "Skywatcher Star Adventurer 2i pro", "Skywatcher EQM-35 Pro", "Skywatcher EQ6-R Pro", "Other"],
  mainCameras: ["", "Canon 800D", "ASI294mc", "ASI224 planetary cam", "Other"],
  guideCameras: ["", "ASI120 mini", "Other"],
  filters: ["", "Optlong L-Extreme filter", "None", "Other"],
  software: ["", "ASIAIR mini", "Other"],
};


function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function safeJsonParse(s) { try { return JSON.parse(s); } catch { return null; } }
function deepClone(x) { return JSON.parse(JSON.stringify(x)); }
function uid(prefix="id") { return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`; }

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsText(file);
  });
}

async function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Failed to read file"));
    r.readAsDataURL(file);
  });
}

/** Optional persistence via Netlify Functions */


function useContainerWidth(ref) {
  const [w, setW] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => setW(Math.max(0, Math.floor(el.getBoundingClientRect().width)));
    measure();

    // Prefer ResizeObserver when available
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(el);
    } else {
      window.addEventListener("resize", measure);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", measure);
    };
  }, [ref]);

  return w;
}

async function tryFetchJson(url, opts) {
  try {
    const r = await fetch(url, opts);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function makeDefaultConfig() {
  const sections = [
    { id: "hero", label: "Hero" },
    { id: "calendar", label: "Calendar" },
    { id: "latestNews", label: "Latest News" },
    { id: "gallery", label: "Gallery" },
    { id: "starcast", label: "Starcast" },
    { id: "eclipseGuide", label: "Eclipse Guide" },
    { id: "phoneBackgrounds", label: "Phone Backgrounds" },
    { id: "footer", label: "Footer" },
  ];

  // Default layouts: stacked, full width (12 cols)
  const mk = (y) => ({ x: 0, y, w: 12, h: 4, minW: 6, minH: 2 });
  const desktopLayout = sections.map((s, i) => ({ i: s.id, ...mk(i * 4) }));
  const mobileLayout = sections.map((s, i) => ({ i: s.id, x: 0, y: i * 4, w: 4, h: 4, minW: 4, minH: 2 }));

  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    secret: DEFAULT_SECRET,

    // how you want to persist
    persistence: {
      mode: "localStorage", // localStorage | netlify
      netlifyGet: "/.netlify/functions/siteConfigGet",
      netlifySave: "/.netlify/functions/siteConfigSave",
    },

    theme: {
      preset: "Nebula Glass",
      tokens: {
        bg: "#070812",
        surface: "rgba(255,255,255,0.06)",
        surface2: "rgba(255,255,255,0.10)",
        border: "rgba(255,255,255,0.10)",
        text: "rgba(255,255,255,0.92)",
        muted: "rgba(255,255,255,0.60)",
        accent: "#8ab4ff",
        radius: 18,
        gap: 14,
        fontBody: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        fontDisplay: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      },
    },

    // Section visibility + per-section style
    sections: sections.reduce((acc, s) => {
      acc[s.id] = {
        id: s.id,
        label: s.label,
        enabled: { desktop: true, mobile: true },
        stylePreset: "default", // default | nebulaGlass | stellarium
        backgroundImage: "", // path or dataURL
        backgroundFit: "cover", // cover | contain
      };
      return acc;
    }, {}),

    // Layouts used by the canvas editor
    layouts: {
      desktop: desktopLayout,
      mobile: mobileLayout,
    },

    // Component order list (used by non-canvas mode; also a fallback)
    order: {
      desktop: sections.map((s) => s.id),
      mobile: sections.map((s) => s.id),
    },

    latestNews: [
      {
        id: "lunar-eclipse-guide",
        title: "Tonight: Total Lunar Eclipse — Live Tracking + Eclipse Guide",
        date: "Mar 3, 2026",
        image: "/images/news/eclipse-og.jpg",
        href: "/eclipse-guide",
        external: false,
        shareHref: "/eclipse-guide",
        description:
          "If skies cooperate, tonight’s total lunar eclipse carries the Moon fully through Earth’s umbra. Live tracking, countdowns, shadow visualization, visibility map, and altitude/azimuth guidance from your location.",
        cta: "Open Eclipse Guide",
        mediaFit: "contain",
        pinned: true,
        status: "published",
      },
    ],

    liveTelescope: {
      status: "offline",
      projectedNextStream: "Clear evenings after dark, weather permitting.",
      askJakeText: "Have a question while I am live? Drop it into YouTube chat and I will answer as many as I can during the session.",
      currentTarget: {
        name: "",
        constellation: "",
        objectType: "",
        description: "",
      },
      targetInfo: {
        title: "",
        summary: "",
        astrobinUrl: "",
      },
      skyConditions: {
        cloudCover: "",
        transparency: "",
        seeing: "",
        moonPhase: "",
        wind: "",
      },
      whereToLook: {
        pointedNear: "",
        direction: "",
        altitude: "",
        constellation: "",
        note: "",
      },
      imageProgress: {
        subsCaptured: "",
        exposureLength: "",
        totalIntegration: "",
        currentFilter: "",
        guidingStable: "",
      },
      equipment: {
        telescope: "",
        telescopeCustom: "",
        mount: "",
        mountCustom: "",
        mainCamera: "",
        mainCameraCustom: "",
        guideCamera: "",
        guideCameraCustom: "",
        filter: "",
        filterCustom: "",
        software: "",
        softwareCustom: "",
      },
    },

    // Useful for absolute URLs (share preview)
    canonicalOrigin: DEFAULT_CANONICAL,
  };
}

function loadLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const j = safeJsonParse(raw || "");
  if (j && j.version === 2) {
    const fresh = makeDefaultConfig();
    const merged = {
      ...fresh,
      ...j,
      liveTelescope: {
        ...fresh.liveTelescope,
        ...(j.liveTelescope || {}),
        currentTarget: {
          ...fresh.liveTelescope.currentTarget,
          ...(j.liveTelescope?.currentTarget || {}),
        },
        targetInfo: {
          ...fresh.liveTelescope.targetInfo,
          ...(j.liveTelescope?.targetInfo || {}),
        },
        skyConditions: {
          ...fresh.liveTelescope.skyConditions,
          ...(j.liveTelescope?.skyConditions || {}),
        },
        whereToLook: {
          ...fresh.liveTelescope.whereToLook,
          ...(j.liveTelescope?.whereToLook || {}),
        },
        imageProgress: {
          ...fresh.liveTelescope.imageProgress,
          ...(j.liveTelescope?.imageProgress || {}),
        },
        equipment: {
          ...fresh.liveTelescope.equipment,
          ...(j.liveTelescope?.equipment || {}),
        },
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }
  const fresh = makeDefaultConfig();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

function saveLocal(cfg) {
  const next = { ...cfg, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  try {
    window.dispatchEvent(new CustomEvent(PREVIEW_EVENT, { detail: next }));
  } catch {}
  try {
    const channel = new BroadcastChannel(PREVIEW_CHANNEL);
    channel.postMessage(next);
    channel.close();
  } catch {}
}

function applyDashboardCss(tokens) {
  const root = document.documentElement;
  root.style.setProperty("--dash-bg", tokens.bg || "#070812");
  root.style.setProperty("--dash-text", tokens.text || "rgba(255,255,255,0.92)");
  root.style.setProperty("--dash-muted", tokens.muted || "rgba(255,255,255,0.60)");
  root.style.setProperty("--dash-border", tokens.border || "rgba(255,255,255,0.10)");
  root.style.setProperty("--dash-surface", tokens.surface || "rgba(255,255,255,0.06)");
  root.style.setProperty("--dash-surface2", tokens.surface2 || "rgba(255,255,255,0.10)");
  root.style.setProperty("--dash-accent", tokens.accent || "#8ab4ff");
  root.style.setProperty("--dash-radius", `${Math.round(tokens.radius ?? 18)}px`);
  root.style.setProperty("--dash-gap", `${Math.round(tokens.gap ?? 14)}px`);
  root.style.setProperty("--dash-font-body", tokens.fontBody || "ui-sans-serif, system-ui");
  root.style.setProperty("--dash-font-display", tokens.fontDisplay || "ui-sans-serif, system-ui");
}

function IconButton({ title, onClick, children, className = "", disabled }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 transition disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ onClick, children, className = "", disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 transition disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

function Field({ label, children, hint }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <div className="text-xs font-semibold text-white/80">{label}</div>
        {hint ? <div className="text-[11px] text-white/40">{hint}</div> : null}
      </div>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, id, name, type = "text" }) {
  return (
    <input
      id={id}
      name={name || id || "dashboard-text-input"}
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/80 outline-none focus:ring-2 focus:ring-white/20"
      placeholder={placeholder}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 4, id, name }) {
  return (
    <textarea
      id={id}
      name={name || id || "dashboard-textarea"}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 outline-none focus:ring-2 focus:ring-white/20"
      placeholder={placeholder}
    />
  );
}

function SelectInput({ value, onChange, options = [], id, name }) {
  return (
    <select
      id={id}
      name={name || id || "dashboard-select"}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/80 outline-none focus:ring-2 focus:ring-white/20"
    >
      {options.map((option) => (
        <option key={option || "blank-option"} value={option} className="bg-[#0a0d16]">
          {option || "Select…"}
        </option>
      ))}
    </select>
  );
}

function ColorInput({ value, onChange, id, name }) {
  const fieldName = name || id || "dashboard-color-input";
  return (
    <div className="flex items-center gap-2">
      <input
        id={id ? `${id}-picker` : undefined}
        name={`${fieldName}-picker`}
        type="color"
        value={value || "#000000"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 rounded-xl border border-white/10 bg-transparent"
      />
      <input
        id={id}
        name={fieldName}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/80 outline-none focus:ring-2 focus:ring-white/20"
        placeholder="#0b0b10"
      />
    </div>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              active ? "bg-white/15 text-white" : "text-white/60 hover:text-white"
            }`}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              {o.icon ? <o.icon size={14} /> : null}
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Card({ title, icon: Icon, right, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {Icon ? <Icon size={18} className="text-white/70" /> : null}
          <div className="text-sm font-semibold text-white/90">{title}</div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Canvas preview tile: shows a “section block” with styling */
function SectionTile({ section, tokens }) {
  const preset = section?.stylePreset || "default";
  const bg =
    preset === "nebulaGlass"
      ? "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))"
      : preset === "stellarium"
      ? "linear-gradient(180deg, rgba(10,30,55,0.25), rgba(0,0,0,0.20))"
      : "rgba(255,255,255,0.06)";

  const border = "rgba(255,255,255,0.12)";
  const img = section?.backgroundImage;

  return (
    <div
      className="h-full w-full overflow-hidden rounded-2xl border p-3"
      style={{
        borderColor: border,
        borderRadius: tokens?.radius ? `${tokens.radius}px` : "18px",
        background: bg,
        color: tokens?.text,
        position: "relative",
      }}
    >
      {img ? (
        <div
          aria-hidden
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage: `url(${img})`,
            backgroundSize: section?.backgroundFit || "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
      ) : null}

      <div className="relative z-10">
        <div className="text-xs font-semibold text-white/85">{section?.label || section?.id}</div>
        <div className="mt-1 text-[11px] text-white/55">
          Drag / resize (snap) • {preset}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard({ onExit, initialTab = "canvas" }) {
  const fileInputRef = useRef(null);
  const imgUploadRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const canvasWidth = useContainerWidth(canvasWrapRef);


  const [locked, setLocked] = useState(false);

  const [history, setHistory] = useState(() => {
    const cfg = loadLocal();
    return { idx: 0, stack: [deepClone(cfg)] };
  });
  const cfg = history.stack[history.idx];
  const tokens = cfg?.theme?.tokens || {};

  const [tab, setTab] = useState(initialTab || "canvas"); // canvas | theme | sections | live | news | persistence
  const [breakpoint, setBreakpoint] = useState("desktop"); // desktop | mobile
  const [filter, setFilter] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("hero");
  const [selectedPostId, setSelectedPostId] = useState(cfg?.latestNews?.[0]?.id || null);

  useEffect(() => { applyDashboardCss(tokens); }, [tokens]);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  // Optional: hydrate from Netlify on load if enabled
  useEffect(() => {
    const mode = cfg?.persistence?.mode || "localStorage";
    if (mode !== "netlify") return;
    (async () => {
      const url = cfg?.persistence?.netlifyGet || "/.netlify/functions/siteConfigGet";
      const remote = await tryFetchJson(url);
      if (remote && remote.version === 2) {
        setHistory({ idx: 0, stack: [deepClone(remote)] });
        saveLocal(remote);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const push = (nextCfg) => {
    setHistory((h) => {
      const next = deepClone(nextCfg);
      const stack = h.stack.slice(0, h.idx + 1);
      stack.push(next);
      const cap = 80;
      const trimmed = stack.length > cap ? stack.slice(stack.length - cap) : stack;
      const idx = trimmed.length - 1;
      saveLocal(trimmed[idx]);
      return { idx, stack: trimmed };
    });
  };

  const undo = () => setHistory((h) => ({ ...h, idx: clamp(h.idx - 1, 0, h.stack.length - 1) }));
  const redo = () => setHistory((h) => ({ ...h, idx: clamp(h.idx + 1, 0, h.stack.length - 1) }));


  const topBar = (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Sparkles className="text-white/80" size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white/90">Jake Site Builder</div>
            <div className="text-[11px] text-white/50">v2 • grid snapping canvas • export/import • optional Netlify save</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <IconButton title="Undo" onClick={undo} className="hidden sm:inline-flex" disabled={locked}>
            <Undo2 size={14} /> Undo
          </IconButton>
          <IconButton title="Redo" onClick={redo} className="hidden sm:inline-flex" disabled={locked}>
            <Redo2 size={14} /> Redo
          </IconButton>

          <PrimaryButton
            onClick={() => downloadText(`site-config.${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(cfg, null, 2))}
          >
            <Download size={14} /> Export
          </PrimaryButton>

          <IconButton title="Import" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} /> Import
          </IconButton>
          <input
            ref={fileInputRef}
            id="site-config-import"
            name="site-config-import"
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const txt = await readFileAsText(f);
              const j = safeJsonParse(txt);
              if (!j || j.version !== 2) {
                alert("Invalid config file (expected version: 2).");
                return;
              }
              push(j);
            }}
          />

          <IconButton title={locked ? "Unlock editing" : "Lock editing"} onClick={() => setLocked((v) => !v)}>
            {locked ? <Lock size={14} /> : <Unlock size={14} />}
            {locked ? "Locked" : "Unlocked"}
          </IconButton>

          <IconButton title="Exit" onClick={() => onExit?.()} className="hidden sm:inline-flex">
            <ArrowLeft size={14} /> Command Center
          </IconButton>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: "canvas", label: "Canvas", icon: LayoutGrid },
                { value: "sections", label: "Sections", icon: SlidersHorizontal },
                { value: "theme", label: "Theme", icon: Palette },
                { value: "live", label: "Live Telescope", icon: Camera },
                { value: "news", label: "Latest News", icon: Type },
                { value: "persistence", label: "Save", icon: CloudUpload },
              ]}
            />
            <Segmented
              value={breakpoint}
              onChange={setBreakpoint}
              options={[
                { value: "desktop", label: "Desktop", icon: Monitor },
                { value: "mobile", label: "Mobile", icon: Smartphone },
              ]}
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                id="dashboard-search"
                name="dashboard-search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search sections / posts…"
                className="h-10 w-full rounded-2xl border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-white/80 outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const allSectionIds = useMemo(() => Object.keys(cfg?.sections || {}), [cfg?.sections]);
  const filteredSectionIds = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return allSectionIds;
    return allSectionIds.filter((id) => {
      const s = cfg.sections[id];
      return `${s.label} ${s.id}`.toLowerCase().includes(q);
    });
  }, [filter, allSectionIds, cfg?.sections]);

  const filteredPosts = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = cfg?.latestNews || [];
    if (!q) return list;
    return list.filter((p) => `${p.title} ${p.date} ${p.description}`.toLowerCase().includes(q));
  }, [filter, cfg?.latestNews]);

  useEffect(() => {
    if (!cfg?.sections?.[selectedSectionId]) {
      setSelectedSectionId(allSectionIds?.[0] || "hero");
    }
  }, [cfg?.sections, selectedSectionId, allSectionIds]);

  useEffect(() => {
    if (selectedPostId && !(cfg?.latestNews || []).some((p) => p.id === selectedPostId)) {
      setSelectedPostId(cfg?.latestNews?.[0]?.id || null);
    }
  }, [cfg?.latestNews, selectedPostId]);

  /** CANVAS EDITOR */
  const canvas = (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Canvas editor (drag/resize + snapping)" icon={LayoutGrid} right={<div className="text-[11px] text-white/40">Grid: {breakpoint === "desktop" ? "12 cols" : "4 cols"}</div>}>
        <div className="text-xs text-white/55">
          This is the “true” layout canvas. It edits <code className="text-white/75">config.layouts.{breakpoint}</code>.
        </div>

        <div ref={canvasWrapRef} className="mt-3 rounded-2xl border border-white/10 bg-black/25 p-2">
          {canvasWidth > 0 ? (
          <Responsive
            className="layout"
            width={canvasWidth || 0}
            layouts={{ lg: cfg.layouts.desktop, sm: cfg.layouts.mobile }}
            breakpoints={{ lg: 1200, sm: 0 }}
            cols={{ lg: 12, sm: 4 }}
            rowHeight={22}
            margin={[10, 10]}
            containerPadding={[10, 10]}
            isResizable={!locked}
            isDraggable={!locked}
            draggableHandle=".tile-handle"
            onLayoutChange={(currentLayout, allLayouts) => {
              if (locked) return;
              const next = deepClone(cfg);
              next.layouts.desktop = allLayouts.lg || next.layouts.desktop;
              next.layouts.mobile = allLayouts.sm || next.layouts.mobile;
              push(next);
            }}
          >
            {(cfg.order[breakpoint] || []).map((id) => {
              const s = cfg.sections[id];
              if (!s) return null;
              const enabled = !!s.enabled?.[breakpoint];
              if (!enabled) return null;

              return (
                <div key={id} className="relative">
                  <div className="absolute right-2 top-2 z-20 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSectionId(id)}
                      className="tile-handle cursor-move rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[11px] text-white/80 hover:bg-black/55"
                      title="Drag"
                    >
                      {s.label}
                    </button>
                  </div>
                  <SectionTile section={s} tokens={tokens} />
                </div>
              );
            })}
          </Responsive>
          ) : (
            <div className="p-6 text-sm text-white/60">Measuring canvas…</div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <IconButton
            title="Auto-stack"
            disabled={locked}
            onClick={() => {
              if (locked) return;
              const next = deepClone(cfg);
              const ids = next.order[breakpoint].filter((id) => next.sections[id]?.enabled?.[breakpoint]);
              const cols = breakpoint === "desktop" ? 12 : 4;
              next.layouts[breakpoint] = ids.map((id, i) => ({ i: id, x: 0, y: i * 4, w: cols, h: 4, minW: cols, minH: 2 }));
              push(next);
            }}
          >
            <LayoutGrid size={14} /> Auto-stack
          </IconButton>

          <IconButton
            title="Reset to defaults"
            disabled={locked}
            onClick={() => {
              if (locked) return;
              push(makeDefaultConfig());
            }}
          >
            <Sparkles size={14} /> Reset
          </IconButton>
        </div>
      </Card>

      <Card title="Sections list" icon={GripVertical}>
        <div className="text-xs text-white/55">Order + enable/disable per breakpoint.</div>
        <div className="mt-3 space-y-2">
          {filteredSectionIds.map((id) => {
            const s = cfg.sections[id];
            const isActive = id === selectedSectionId;
            const enabled = !!s.enabled?.[breakpoint];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedSectionId(id)}
                className={`w-full rounded-2xl border border-white/10 px-3 py-2 text-left transition ${
                  isActive ? "bg-white/10 ring-1 ring-white/15" : "bg-black/25 hover:bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white/85">{s.label}</div>
                    <div className="truncate text-[11px] text-white/45">{id}</div>
                  </div>
                  <label
                    className="inline-flex items-center gap-2 text-[11px] font-semibold text-white/70"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={locked}
                      onChange={(e) => {
                        const next = deepClone(cfg);
                        next.sections[id].enabled[breakpoint] = e.target.checked;
                        push(next);
                      }}
                      className="h-4 w-4 rounded border-white/20 bg-black/40"
                    />
                    Enabled
                  </label>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <SectionInspector
        cfg={cfg}
        tokens={tokens}
        locked={locked}
        push={push}
        selectedSectionId={selectedSectionId}
        setSelectedSectionId={setSelectedSectionId}
        imgUploadRef={imgUploadRef}
      />
    </div>
  );

  /** SECTION INSPECTOR */
  function SectionInspector({ cfg, tokens, locked, push, selectedSectionId, imgUploadRef }) {
    const s = cfg?.sections?.[selectedSectionId] || null;

    const FONT_PRESETS = [
      {
        name: "Stellarium-ish",
        body: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        display: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      },
      {
        name: "Nebula Glass",
        body: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        display: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
      },
      {
        name: "Classic Serif",
        body: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
        display: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
      },
    ];

    const STYLE_PRESETS = [
      { value: "default", label: "Default" },
      { value: "nebulaGlass", label: "Nebula Glass" },
      { value: "stellarium", label: "Stellarium-ish" },
    ];

    if (!s) {
      return (
        <Card title="Section inspector" icon={SlidersHorizontal}>
          <div className="text-sm text-white/60">Select a section.</div>
        </Card>
      );
    }

    return (
      <Card
        title="Section inspector"
        icon={SlidersHorizontal}
        right={
          <IconButton
            title="Remove background image"
            disabled={locked || !s.backgroundImage}
            onClick={() => {
              if (locked) return;
              const next = deepClone(cfg);
              next.sections[s.id].backgroundImage = "";
              push(next);
            }}
          >
            <Trash2 size={14} /> Clear bg
          </IconButton>
        }
      >
        <div className="space-y-3">
          <div className="text-xs text-white/55">
            Edit styling for <span className="text-white/85 font-semibold">{s.label}</span> (per section).
          </div>

          <Field label="Style preset">
            <select
              value={s.stylePreset || "default"}
              disabled={locked}
              onChange={(e) => {
                const next = deepClone(cfg);
                next.sections[s.id].stylePreset = e.target.value;
                push(next);
              }}
              className="h-9 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/80 outline-none"
            >
              {STYLE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Background image" hint="Path or upload">
            <TextInput
              value={s.backgroundImage || ""}
              onChange={(v) => {
                if (locked) return;
                const next = deepClone(cfg);
                next.sections[s.id].backgroundImage = v;
                push(next);
              }}
              placeholder="/images/gallery/hero/hero.jpg"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <IconButton title="Upload image" disabled={locked} onClick={() => imgUploadRef.current?.click()}>
                <ImageIcon size={14} /> Upload
              </IconButton>
              <IconButton
                title="Quick: use hero image"
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  const next = deepClone(cfg);
                  next.sections[s.id].backgroundImage = "/images/gallery/hero/hero.jpg";
                  next.sections[s.id].backgroundFit = "cover";
                  push(next);
                }}
              >
                <Sparkles size={14} /> Use hero
              </IconButton>
            </div>
          </Field>

          <Field label="Background fit">
            <select
              value={s.backgroundFit || "cover"}
              disabled={locked}
              onChange={(e) => {
                const next = deepClone(cfg);
                next.sections[s.id].backgroundFit = e.target.value;
                push(next);
              }}
              className="h-9 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/80 outline-none"
            >
              <option value="cover">cover</option>
              <option value="contain">contain</option>
            </select>
          </Field>

          <Field label="Font preset (global)" hint="Applies to theme fonts">
            <div className="flex flex-wrap gap-2">
              {FONT_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    const next = deepClone(cfg);
                    next.theme.preset = p.name;
                    next.theme.tokens.fontBody = p.body;
                    next.theme.tokens.fontDisplay = p.display;
                    push(next);
                  }}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] font-semibold text-white/80 hover:bg-white/5 disabled:opacity-40"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <input
          ref={imgUploadRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            const dataUrl = await readFileAsDataURL(f);
            const next = deepClone(cfg);
            next.sections[s.id].backgroundImage = dataUrl;
            next.sections[s.id].backgroundFit = "cover";
            push(next);
          }}
        />
      </Card>
    );
  }

  /** THEME EDITOR */
  const theme = (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Theme tokens" icon={Palette} right={<div className="text-[11px] text-white/40">Preview affects dashboard</div>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Background"><ColorInput value={tokens.bg} onChange={(v) => { if (locked) return; const next=deepClone(cfg); next.theme.tokens.bg=v; push(next); }} /></Field>
          <Field label="Accent"><ColorInput value={tokens.accent} onChange={(v) => { if (locked) return; const next=deepClone(cfg); next.theme.tokens.accent=v; push(next); }} /></Field>
          <Field label="Surface" hint="rgba(...)"><TextInput value={tokens.surface} onChange={(v)=>{ if(locked)return; const next=deepClone(cfg); next.theme.tokens.surface=v; push(next); }} placeholder="rgba(255,255,255,0.06)" /></Field>
          <Field label="Surface 2" hint="rgba(...)"><TextInput value={tokens.surface2} onChange={(v)=>{ if(locked)return; const next=deepClone(cfg); next.theme.tokens.surface2=v; push(next); }} placeholder="rgba(255,255,255,0.10)" /></Field>
          <Field label="Text" hint="rgba(...)"><TextInput value={tokens.text} onChange={(v)=>{ if(locked)return; const next=deepClone(cfg); next.theme.tokens.text=v; push(next); }} placeholder="rgba(255,255,255,0.92)" /></Field>
          <Field label="Muted" hint="rgba(...)"><TextInput value={tokens.muted} onChange={(v)=>{ if(locked)return; const next=deepClone(cfg); next.theme.tokens.muted=v; push(next); }} placeholder="rgba(255,255,255,0.60)" /></Field>

          <Field label="Body font" hint="CSS font-family"><TextInput value={tokens.fontBody} onChange={(v)=>{ if(locked)return; const next=deepClone(cfg); next.theme.tokens.fontBody=v; push(next); }} /></Field>
          <Field label="Display font" hint="Headings"><TextInput value={tokens.fontDisplay} onChange={(v)=>{ if(locked)return; const next=deepClone(cfg); next.theme.tokens.fontDisplay=v; push(next); }} /></Field>

          <Field label="Radius" hint="px">
            <input type="range" min="8" max="28" value={Number(tokens.radius ?? 18)} disabled={locked}
              onChange={(e)=>{ const next=deepClone(cfg); next.theme.tokens.radius=parseInt(e.target.value,10); push(next); }} className="w-full" />
            <div className="text-[11px] text-white/45">{Math.round(tokens.radius ?? 18)}px</div>
          </Field>
          <Field label="Gap" hint="px">
            <input type="range" min="8" max="24" value={Number(tokens.gap ?? 14)} disabled={locked}
              onChange={(e)=>{ const next=deepClone(cfg); next.theme.tokens.gap=parseInt(e.target.value,10); push(next); }} className="w-full" />
            <div className="text-[11px] text-white/45">{Math.round(tokens.gap ?? 14)}px</div>
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <IconButton title="Random preset" disabled={locked} onClick={() => {
            if (locked) return;
            const presets = [
              { name: "Nebula Glass", t: { bg:"#070812", accent:"#8ab4ff", surface:"rgba(255,255,255,0.06)" } },
              { name: "Warm Bronze", t: { bg:"#0b0a08", accent:"#d4b27b", surface:"rgba(255,255,255,0.05)" } },
              { name: "Stellarium-ish", t: { bg:"#02040a", accent:"#7fd3ff", surface:"rgba(255,255,255,0.05)" } },
            ];
            const pick = presets[Math.floor(Math.random()*presets.length)];
            const next = deepClone(cfg);
            next.theme.preset = pick.name;
            next.theme.tokens = { ...next.theme.tokens, ...pick.t };
            push(next);
          }}>
            <Sparkles size={14} /> Random preset
          </IconButton>

          <IconButton title="Reset" disabled={locked} onClick={() => { if (locked) return; push(makeDefaultConfig()); }}>
            <Sparkles size={14} /> Reset
          </IconButton>
        </div>
      </Card>

      <Card title="Theme preview" icon={Palette}>
        <div
          className="rounded-2xl border border-white/10 p-4"
          style={{
            borderColor: "var(--dash-border)",
            background: "var(--dash-surface)",
            color: "var(--dash-text)",
            borderRadius: "var(--dash-radius)",
            fontFamily: "var(--dash-font-body)",
          }}
        >
          <div className="text-lg font-semibold" style={{ fontFamily: "var(--dash-font-display)" }}>
            {cfg.theme.preset}
          </div>
          <div className="mt-1 text-sm" style={{ color: "var(--dash-muted)" }}>
            This preview is dashboard-only. When you say “go live”, we’ll apply these tokens to the public site with fallbacks (no design changes).
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: "var(--dash-surface2)", border: `1px solid var(--dash-border)` }}>Card</span>
            <span className="inline-flex items-center rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: "var(--dash-accent)", color: "#0b0b10" }}>Accent</span>
            <span className="inline-flex items-center rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: "transparent", border: `1px solid var(--dash-border)` }}>Outline</span>
          </div>
        </div>
      </Card>
    </div>
  );

  /** LATEST NEWS EDITOR */
  const news = (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card
        title="Latest News"
        icon={Type}
        right={
          <PrimaryButton
            disabled={locked}
            onClick={() => {
              if (locked) return;
              const next = deepClone(cfg);
              next.latestNews = [
                { id: uid("post"), title: "New post", date: new Date().toLocaleDateString(undefined, { month:"short", day:"numeric", year:"numeric" }), image: "", href: "/", external:false, shareHref:"/", description:"", cta:"Open", mediaFit:"contain", pinned:false, status:"draft" },
                ...(next.latestNews || []),
              ];
              push(next);
              setSelectedPostId(next.latestNews[0].id);
            }}
          >
            <Plus size={14} /> Add post
          </PrimaryButton>
        }
      >
        <div className="text-xs text-white/55">Reorder by drag in the public feed later; for now export/import is the “source of truth”.</div>

        <div className="mt-3 space-y-2">
          {filteredPosts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPostId(p.id)}
              className={`w-full rounded-2xl border border-white/10 px-3 py-2 text-left transition ${
                p.id === selectedPostId ? "bg-white/10 ring-1 ring-white/15" : "bg-black/25 hover:bg-white/5"
              }`}
            >
              <div className="truncate text-sm font-semibold text-white/85">{p.title || "Untitled"}</div>
              <div className="truncate text-[11px] text-white/45">{p.date}{p.pinned ? " • pinned" : ""}{p.status==="draft" ? " • draft" : ""}</div>
            </button>
          ))}
        </div>
      </Card>

      <NewsInspector cfg={cfg} locked={locked} push={push} selectedPostId={selectedPostId} />
    </div>
  );

  function NewsInspector({ cfg, locked, push, selectedPostId }) {
    const post = (cfg?.latestNews || []).find((p) => p.id === selectedPostId) || null;
    if (!post) return (
      <Card title="Post editor" icon={Type}><div className="text-sm text-white/60">Select a post.</div></Card>
    );

    const update = (patch) => {
      if (locked) return;
      const next = deepClone(cfg);
      const idx = next.latestNews.findIndex((p) => p.id === post.id);
      next.latestNews[idx] = { ...next.latestNews[idx], ...patch };
      push(next);
    };

    return (
      <Card
        title="Post editor"
        icon={Type}
        right={
          <IconButton
            title="Delete post"
            disabled={locked}
            onClick={() => {
              if (locked) return;
              if (!confirm("Delete this post?")) return;
              const next = deepClone(cfg);
              next.latestNews = (next.latestNews || []).filter((x) => x.id !== post.id);
              push(next);
            }}
          >
            <Trash2 size={14} /> Delete
          </IconButton>
        }
      >
        <div className="space-y-3">
          <Field label="Title"><TextInput value={post.title} onChange={(v)=>update({ title:v })} /></Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date"><TextInput value={post.date} onChange={(v)=>update({ date:v })} placeholder="Mar 3, 2026" /></Field>
            <Field label="Status">
              <select value={post.status || "published"} disabled={locked} onChange={(e)=>update({ status:e.target.value })}
                className="h-9 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/80 outline-none">
                <option value="published">published</option>
                <option value="draft">draft</option>
              </select>
            </Field>
            <Field label="Pinned">
              <label className="inline-flex h-9 w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/80">
                <span>Pin this post</span>
                <input type="checkbox" checked={!!post.pinned} disabled={locked} onChange={(e)=>update({ pinned:e.target.checked })}
                  className="h-4 w-4 rounded border-white/20 bg-black/40" />
              </label>
            </Field>
            <Field label="External link?">
              <label className="inline-flex h-9 w-full items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/80">
                <span>Open in new tab</span>
                <input type="checkbox" checked={!!post.external} disabled={locked} onChange={(e)=>update({ external:e.target.checked })}
                  className="h-4 w-4 rounded border-white/20 bg-black/40" />
              </label>
            </Field>
          </div>

          <Field label="Image (path or URL)">
            <TextInput value={post.image} onChange={(v)=>update({ image:v })} placeholder="/images/gallery/markarians-chain.jpg" />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Destination (href)"><TextInput value={post.href} onChange={(v)=>update({ href:v })} placeholder="/eclipse-guide" /></Field>
            <Field label="Share href"><TextInput value={post.shareHref} onChange={(v)=>update({ shareHref:v })} placeholder="/share/markarians-chain/" /></Field>
          </div>

          <Field label="CTA text"><TextInput value={post.cta} onChange={(v)=>update({ cta:v })} placeholder="View on AstroBin" /></Field>

          <Field label="Media fit">
            <select value={post.mediaFit || "contain"} disabled={locked} onChange={(e)=>update({ mediaFit:e.target.value })}
              className="h-9 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/80 outline-none">
              <option value="contain">contain</option>
              <option value="cover">cover</option>
            </select>
          </Field>

          <Field label="Description">
            <TextArea value={post.description} onChange={(v)=>update({ description:v })} rows={7} placeholder="Write the post body…" />
          </Field>
        </div>
      </Card>
    );
  }

  /** PERSISTENCE */
  const persistence = (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Persistence mode" icon={CloudUpload}>
        <div className="text-xs text-white/55">
          Default is localStorage + Export/Import. If you enable Netlify Functions, this can save/load automatically.
        </div>

        <div className="mt-3 space-y-3">
          <Field label="Mode">
            <select
              id="persistence-mode"
              name="persistence-mode"
              value={cfg?.persistence?.mode || "localStorage"}
              disabled={locked}
              onChange={(e) => {
                const next = deepClone(cfg);
                next.persistence.mode = e.target.value;
                push(next);
              }}
              className="h-9 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/80 outline-none"
            >
              <option value="localStorage">localStorage (default)</option>
              <option value="netlify">Netlify Functions</option>
            </select>
          </Field>

          <Field label="Netlify GET endpoint">
            <TextInput
              value={cfg?.persistence?.netlifyGet || ""}
              onChange={(v) => { if (locked) return; const next=deepClone(cfg); next.persistence.netlifyGet=v; push(next); }}
              placeholder="/.netlify/functions/siteConfigGet"
            />
          </Field>

          <Field label="Netlify SAVE endpoint">
            <TextInput
              value={cfg?.persistence?.netlifySave || ""}
              onChange={(v) => { if (locked) return; const next=deepClone(cfg); next.persistence.netlifySave=v; push(next); }}
              placeholder="/.netlify/functions/siteConfigSave"
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <PrimaryButton
              disabled={locked || (cfg?.persistence?.mode !== "netlify")}
              onClick={async () => {
                const url = cfg?.persistence?.netlifySave || "/.netlify/functions/siteConfigSave";
                const ok = await tryFetchJson(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(cfg) });
                if (ok) alert("Saved to Netlify function ✅");
                else alert("Save failed. (Function not installed yet?)");
              }}
            >
              <CloudUpload size={14} /> Save now
            </PrimaryButton>

            <IconButton
              disabled={locked || (cfg?.persistence?.mode !== "netlify")}
              title="Load"
              onClick={async () => {
                const url = cfg?.persistence?.netlifyGet || "/.netlify/functions/siteConfigGet";
                const remote = await tryFetchJson(url);
                if (remote && remote.version === 2) {
                  push(remote);
                  alert("Loaded ✅");
                } else {
                  alert("Load failed. (Function not installed yet?)");
                }
              }}
            >
              <FileDown size={14} /> Load now
            </IconButton>
          </div>

          <div className="mt-2 text-[11px] text-white/45">
            If you want “save-to-repo”, the simplest safe workflow is: Export JSON → replace <code className="text-white/70">public/site-config.json</code> → commit/push.
          </div>
        </div>
      </Card>

      <Card title="Wiring checklist" icon={Sparkles}>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-white/70">
          <li>Add <code className="text-white/80">public/site-config.json</code> (from Export)</li>
          <li>In public site, load config with <code className="text-white/80">fetch("/site-config.json")</code> and fallback to defaults</li>
          <li>Render sections by <code className="text-white/80">config.order[breakpoint]</code> and <code className="text-white/80">config.sections[id].enabled</code></li>
          <li>Apply theme tokens as CSS variables (no design change)</li>
        </ol>
        <div className="mt-3 text-[11px] text-white/45">
          You asked for “zero design changes” — that’s exactly why we keep hardcoded defaults as fallbacks.
        </div>
      </Card>
    </div>
  );

  const liveCfg = cfg?.liveTelescope || makeDefaultConfig().liveTelescope;
  const liveEquipment = liveCfg.equipment || {};
  const liveTarget = liveCfg.currentTarget || {};
  const liveTargetInfo = liveCfg.targetInfo || {};
  const liveSky = liveCfg.skyConditions || {};
  const liveWhere = liveCfg.whereToLook || {};
  const liveProgress = liveCfg.imageProgress || {};
  const selectedOrCustom = (value, customValue) => (value === "Other" ? (customValue || "Other") : value);

  const liveTab = (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
      <Card title="Live Telescope editor" icon={Camera}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Stream status">
            <SelectInput
              id="live-stream-status"
              name="live-stream-status"
              value={liveCfg.status || "offline"}
              options={["offline", "startingSoon", "live"]}
              onChange={(value) => {
                if (locked) return;
                const next = deepClone(cfg);
                next.liveTelescope = next.liveTelescope || {};
                next.liveTelescope.status = value;
                push(next);
              }}
            />
          </Field>
          <Field label="Projected next stream">
            <TextInput
              id="live-projected-next-stream"
              name="live-projected-next-stream"
              value={liveCfg.projectedNextStream || ""}
              onChange={(value) => {
                if (locked) return;
                const next = deepClone(cfg);
                next.liveTelescope = next.liveTelescope || {};
                next.liveTelescope.projectedNextStream = value;
                push(next);
              }}
              placeholder="Clear evenings after dark, weather permitting."
            />
          </Field>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Ask Jake text">
            <TextArea id="live-ask-jake" name="live-ask-jake" value={liveCfg.askJakeText || ""} onChange={(value) => {
              if (locked) return;
              const next = deepClone(cfg);
              next.liveTelescope = next.liveTelescope || {};
              next.liveTelescope.askJakeText = value;
              push(next);
            }} rows={3} placeholder="Have a question while I am live?" />
          </Field>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/65">
            Leave Current Target, Target Info, Sky Conditions, or Image Progress fields blank when you do not want those cards to show on the public page.
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Target name">
            <TextInput id="live-target-name" name="live-target-name" value={liveTarget.name || ""} onChange={(value) => {
              if (locked) return;
              const next = deepClone(cfg);
              next.liveTelescope = next.liveTelescope || {};
              next.liveTelescope.currentTarget = { ...(next.liveTelescope.currentTarget || {}), name: value };
              push(next);
            }} placeholder="M42, Jupiter, Rosette Nebula…" />
          </Field>
          <Field label="Constellation">
            <TextInput id="live-target-constellation" name="live-target-constellation" value={liveTarget.constellation || ""} onChange={(value) => {
              if (locked) return;
              const next = deepClone(cfg);
              next.liveTelescope = next.liveTelescope || {};
              next.liveTelescope.currentTarget = { ...(next.liveTelescope.currentTarget || {}), constellation: value };
              push(next);
            }} placeholder="Orion" />
          </Field>
          <Field label="Object type">
            <TextInput id="live-target-type" name="live-target-type" value={liveTarget.objectType || ""} onChange={(value) => {
              if (locked) return;
              const next = deepClone(cfg);
              next.liveTelescope = next.liveTelescope || {};
              next.liveTelescope.currentTarget = { ...(next.liveTelescope.currentTarget || {}), objectType: value };
              push(next);
            }} placeholder="Nebula, galaxy, planet…" />
          </Field>
          <Field label="Short description">
            <TextArea id="live-target-description" name="live-target-description" value={liveTarget.description || ""} onChange={(value) => {
              if (locked) return;
              const next = deepClone(cfg);
              next.liveTelescope = next.liveTelescope || {};
              next.liveTelescope.currentTarget = { ...(next.liveTelescope.currentTarget || {}), description: value };
              push(next);
            }} rows={3} placeholder="Optional note about what you are imaging tonight." />
          </Field>
        </div>
      </Card>

      <Card title="Where to look in the sky" icon={Compass}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Currently pointed near">
            <TextInput value={liveWhere.pointedNear || ""} onChange={(value) => {
              if (locked) return;
              const next = deepClone(cfg);
              next.liveTelescope = next.liveTelescope || {};
              next.liveTelescope.whereToLook = { ...(next.liveTelescope.whereToLook || {}), pointedNear: value };
              push(next);
            }} placeholder="M42, the Belt stars, eastern Orion…" />
          </Field>
          <Field label="Direction">
            <SelectInput value={liveWhere.direction || ""} options={["", "N", "NE", "E", "SE", "S", "SW", "W", "NW"]} onChange={(value) => {
              if (locked) return;
              const next = deepClone(cfg);
              next.liveTelescope = next.liveTelescope || {};
              next.liveTelescope.whereToLook = { ...(next.liveTelescope.whereToLook || {}), direction: value };
              push(next);
            }} />
          </Field>
          <Field label="Altitude">
            <TextInput value={liveWhere.altitude || ""} onChange={(value) => {
              if (locked) return;
              const next = deepClone(cfg);
              next.liveTelescope = next.liveTelescope || {};
              next.liveTelescope.whereToLook = { ...(next.liveTelescope.whereToLook || {}), altitude: value };
              push(next);
            }} placeholder="45° up" />
          </Field>
          <Field label="Constellation">
            <TextInput value={liveWhere.constellation || ""} onChange={(value) => {
              if (locked) return;
              const next = deepClone(cfg);
              next.liveTelescope = next.liveTelescope || {};
              next.liveTelescope.whereToLook = { ...(next.liveTelescope.whereToLook || {}), constellation: value };
              push(next);
            }} placeholder="Orion" />
          </Field>
          <div className="md:col-span-2">
            <Field label="Viewer note">
              <TextArea rows={3} value={liveWhere.note || ""} onChange={(value) => {
                if (locked) return;
                const next = deepClone(cfg);
                next.liveTelescope = next.liveTelescope || {};
                next.liveTelescope.whereToLook = { ...(next.liveTelescope.whereToLook || {}), note: value };
                push(next);
              }} placeholder="Try looking halfway up the southeastern sky above Orion's Belt." />
            </Field>
          </div>
        </div>
      </Card>

      <Card title="Equipment tonight" icon={SlidersHorizontal}>
        <div className="space-y-4">
          {[ ["telescope","Telescope",STREAM_GEAR_OPTIONS.telescopes],["mount","Mount",STREAM_GEAR_OPTIONS.mounts],["mainCamera","Main Camera",STREAM_GEAR_OPTIONS.mainCameras],["guideCamera","Guide Camera",STREAM_GEAR_OPTIONS.guideCameras],["filter","Filter",STREAM_GEAR_OPTIONS.filters],["software","Software",STREAM_GEAR_OPTIONS.software] ].map(([key,label,options]) => {
            const customKey = `${key}Custom`;
            return (
              <div key={key} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <Field label={label}>
                  <SelectInput id={`live-${key}`} name={`live-${key}`} value={liveEquipment[key] || ""} options={options} onChange={(value) => {
                    if (locked) return;
                    const next = deepClone(cfg);
                    next.liveTelescope = next.liveTelescope || {};
                    next.liveTelescope.equipment = { ...(next.liveTelescope.equipment || {}), [key]: value, [customKey]: value === "Other" ? (next.liveTelescope.equipment?.[customKey] || "") : "" };
                    push(next);
                  }} />
                </Field>
                {(liveEquipment[key] || "") === "Other" ? (
                  <div className="mt-3">
                    <TextInput id={`live-${key}-custom`} name={`live-${key}-custom`} value={liveEquipment[customKey] || ""} onChange={(value) => {
                      if (locked) return;
                      const next = deepClone(cfg);
                      next.liveTelescope = next.liveTelescope || {};
                      next.liveTelescope.equipment = { ...(next.liveTelescope.equipment || {}), [customKey]: value };
                      push(next);
                    }} placeholder={`Custom ${String(label).toLowerCase()}`} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Target info + image progress" icon={Target} className="xl:col-span-2">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <Field label="Target info title">
              <TextInput value={liveTargetInfo.title || ""} onChange={(value) => {
                if (locked) return;
                const next = deepClone(cfg);
                next.liveTelescope = next.liveTelescope || {};
                next.liveTelescope.targetInfo = { ...(next.liveTelescope.targetInfo || {}), title: value };
                push(next);
              }} placeholder="Target info title" />
            </Field>
            <Field label="Target info summary">
              <TextArea rows={4} value={liveTargetInfo.summary || ""} onChange={(value) => {
                if (locked) return;
                const next = deepClone(cfg);
                next.liveTelescope = next.liveTelescope || {};
                next.liveTelescope.targetInfo = { ...(next.liveTelescope.targetInfo || {}), summary: value };
                push(next);
              }} placeholder="Short educational note about tonight's object" />
            </Field>
            <Field label="Target info link">
              <TextInput value={liveTargetInfo.astrobinUrl || ""} onChange={(value) => {
                if (locked) return;
                const next = deepClone(cfg);
                next.liveTelescope = next.liveTelescope || {};
                next.liveTelescope.targetInfo = { ...(next.liveTelescope.targetInfo || {}), astrobinUrl: value };
                push(next);
              }} placeholder="Optional AstroBin or related URL" />
            </Field>
          </div>
          <div className="space-y-4">
            <Field label="Subs captured"><TextInput value={liveProgress.subsCaptured || ""} onChange={(value) => { if (locked) return; const next = deepClone(cfg); next.liveTelescope = next.liveTelescope || {}; next.liveTelescope.imageProgress = { ...(next.liveTelescope.imageProgress || {}), subsCaptured: value }; push(next); }} placeholder="Number of subs captured" /></Field>
            <Field label="Exposure length"><TextInput value={liveProgress.exposureLength || ""} onChange={(value) => { if (locked) return; const next = deepClone(cfg); next.liveTelescope = next.liveTelescope || {}; next.liveTelescope.imageProgress = { ...(next.liveTelescope.imageProgress || {}), exposureLength: value }; push(next); }} placeholder="Exposure length" /></Field>
            <Field label="Total integration"><TextInput value={liveProgress.totalIntegration || ""} onChange={(value) => { if (locked) return; const next = deepClone(cfg); next.liveTelescope = next.liveTelescope || {}; next.liveTelescope.imageProgress = { ...(next.liveTelescope.imageProgress || {}), totalIntegration: value }; push(next); }} placeholder="Total integration" /></Field>
            <Field label="Current filter"><TextInput value={liveProgress.currentFilter || ""} onChange={(value) => { if (locked) return; const next = deepClone(cfg); next.liveTelescope = next.liveTelescope || {}; next.liveTelescope.imageProgress = { ...(next.liveTelescope.imageProgress || {}), currentFilter: value }; push(next); }} placeholder="Current filter" /></Field>
            <Field label="Guiding stable"><TextInput value={liveProgress.guidingStable || ""} onChange={(value) => { if (locked) return; const next = deepClone(cfg); next.liveTelescope = next.liveTelescope || {}; next.liveTelescope.imageProgress = { ...(next.liveTelescope.imageProgress || {}), guidingStable: value }; push(next); }} placeholder="Yes / No / RMS etc." /></Field>
          </div>
        </div>
      </Card>

      <Card title="Sky conditions preview" icon={Compass} className="xl:col-span-2">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[ ["cloudCover","Cloud cover"],["transparency","Transparency"],["seeing","Seeing"],["moonPhase","Moon phase"],["wind","Wind"] ].map(([key,label]) => (
            <Field key={key} label={label}>
              <TextInput value={liveSky[key] || ""} onChange={(value) => { if (locked) return; const next = deepClone(cfg); next.liveTelescope = next.liveTelescope || {}; next.liveTelescope.skyConditions = { ...(next.liveTelescope.skyConditions || {}), [key]: value }; push(next); }} placeholder={label} />
            </Field>
          ))}
        </div>
      </Card>

      <Card title="Live page preview text" icon={Type} className="xl:col-span-2">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Status</div>
            <div className="mt-2 text-sm text-white/80">{liveCfg.status === "live" ? "Live now" : liveCfg.status === "startingSoon" ? "Starting soon" : "Offline"}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Projected next stream</div>
            <div className="mt-2 text-sm text-white/80">{liveCfg.projectedNextStream || "—"}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Current target</div>
            <div className="mt-2 text-sm text-white/80">{liveTarget.name ? `${liveTarget.name}${liveTarget.constellation ? ` • ${liveTarget.constellation}` : ""}` : "Hidden until you set a target."}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Equipment tonight</div>
            <div className="mt-2 text-sm text-white/80">{[selectedOrCustom(liveEquipment.telescope, liveEquipment.telescopeCustom), selectedOrCustom(liveEquipment.mount, liveEquipment.mountCustom), selectedOrCustom(liveEquipment.mainCamera, liveEquipment.mainCameraCustom)].filter(Boolean).join(" • ") || "Select your gear from the dropdowns."}</div>
          </div>
        </div>
      </Card>
    </div>
  );

  const sectionsTab = (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Section quick controls" icon={SlidersHorizontal}>
        <div className="text-xs text-white/55">
          Toggle visibility + style presets quickly. (Inspector is richer in Canvas tab.)
        </div>

        <div className="mt-3 space-y-2">
          {filteredSectionIds.map((id) => {
            const s = cfg.sections[id];
            return (
              <div key={id} className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white/85">{s.label}</div>
                    <div className="text-[11px] text-white/45">{id}</div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-white/70">
                    <input type="checkbox" checked={!!s.enabled?.[breakpoint]} disabled={locked}
                      onChange={(e)=>{ const next=deepClone(cfg); next.sections[id].enabled[breakpoint]=e.target.checked; push(next); }}
                      className="h-4 w-4 rounded border-white/20 bg-black/40" />
                    Enabled
                  </label>
                </div>

                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <select value={s.stylePreset || "default"} disabled={locked}
                    onChange={(e)=>{ const next=deepClone(cfg); next.sections[id].stylePreset=e.target.value; push(next); }}
                    className="h-9 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white/80 outline-none">
                    <option value="default">Default</option>
                    <option value="nebulaGlass">Nebula Glass</option>
                    <option value="stellarium">Stellarium-ish</option>
                  </select>

                  <TextInput value={s.backgroundImage || ""} onChange={(v)=>{ if(locked)return; const next=deepClone(cfg); next.sections[id].backgroundImage=v; push(next); }}
                    placeholder="Background image path (optional)" />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

    </div>
  );

  const content = (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {tab === "canvas" ? canvas : null}
      {tab === "sections" ? sectionsTab : null}
      {tab === "live" ? liveTab : null}
      {tab === "theme" ? theme : null}
      {tab === "news" ? news : null}
      {tab === "persistence" ? persistence : null}
    </div>
  );

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--dash-bg)", color: "var(--dash-text)", fontFamily: "var(--dash-font-body)" }}
    >
      {topBar}
      {content}
      <div className="mx-auto max-w-6xl px-4 pb-10 text-[11px] text-white/40">
        If you want, I can generate your updated <b>AstrophotographySite.jsx</b> that reads <code className="text-white/70">/site-config.json</code> and applies it with fallbacks (no layout changes) — then this dashboard becomes the real editor.
      </div>
    </div>
  );
}
