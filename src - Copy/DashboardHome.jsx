import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Copy,
  Database,
  ExternalLink,
  Eye,
  FilePlus2,
  Globe,
  HardDrive,
  Image as ImageIcon,
  Layers3,
  Monitor,
  Palette,
  PanelLeft,
  PencilRuler,
  RefreshCcw,
  RefreshCw,
  Rocket,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  AlertTriangle,
  Camera,
  Compass,
} from "lucide-react";
import { SITE_VERSION, RELEASE_NAME, RELEASE_DATE } from "./siteVersion";

const STORAGE_KEY = "jake_site_builder_v2";
const PREVIEW_EVENT = "jake-site-config-updated";
const PREVIEW_CHANNEL = "jake-site-config";
const YOUTUBE_LIVE_CHANNEL_ID = "UCNG0QTu2_0LYwTmYHHMVXXA";
const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@JakeSchultzAstrophotography";
const YOUTUBE_LIVE_EMBED_URL = `https://www.youtube.com/embed/live_stream?channel=${YOUTUBE_LIVE_CHANNEL_ID}&autoplay=0&mute=1`;
const STREAM_GEAR_OPTIONS = {
  telescope: ["", "Redcat 51", "Apertura 6\" Astrograph", "Celestron C11", "Other"],
  mount: ["", "Skywatcher Star Adventurer 2i pro", "Skywatcher EQM-35 Pro", "Skywatcher EQ6-R Pro", "Other"],
  mainCamera: ["", "Canon 800D", "ASI294mc", "ASI224 planetary cam", "Other"],
  guideCamera: ["", "ASI120 mini", "Other"],
  filter: ["", "Optlong L-Extreme filter", "None", "Other"],
  software: ["", "ASIAIR mini", "Other"],
};

function makeDefaultLiveTelescope() {
  return {
    status: "offline",
    projectedNextStream: "Clear evenings after dark, weather permitting.",
    askJakeText: "Have a question while I am live? Drop it into YouTube chat and I will answer as many as I can during the session.",
    currentTarget: { name: "", constellation: "", objectType: "", description: "" },
    targetInfo: { title: "", summary: "", astrobinUrl: "" },
    skyConditions: { cloudCover: "", transparency: "", seeing: "", moonPhase: "", wind: "" },
    whereToLook: { pointedNear: "", direction: "", altitude: "", constellation: "", note: "" },
    imageProgress: { subsCaptured: "", exposureLength: "", totalIntegration: "", currentFilter: "", guidingStable: "" },
    equipment: {
      telescope: "", telescopeCustom: "",
      mount: "", mountCustom: "",
      mainCamera: "", mainCameraCustom: "",
      guideCamera: "", guideCameraCustom: "",
      filter: "", filterCustom: "",
      software: "", softwareCustom: "",
    },
  };
}

function withLiveTelescope(cfg) {
  const base = makeDefaultLiveTelescope();
  const source = cfg || {};
  return {
    ...source,
    liveTelescope: {
      ...base,
      ...(source.liveTelescope || {}),
      currentTarget: { ...base.currentTarget, ...(source.liveTelescope?.currentTarget || {}) },
      targetInfo: { ...base.targetInfo, ...(source.liveTelescope?.targetInfo || {}) },
      skyConditions: { ...base.skyConditions, ...(source.liveTelescope?.skyConditions || {}) },
      whereToLook: { ...base.whereToLook, ...(source.liveTelescope?.whereToLook || {}) },
      imageProgress: { ...base.imageProgress, ...(source.liveTelescope?.imageProgress || {}) },
      equipment: { ...base.equipment, ...(source.liveTelescope?.equipment || {}) },
    },
  };
}

function writeDashboardSnapshot(next) {
  if (typeof window === "undefined") return;
  const payload = { ...next, updatedAt: new Date().toISOString() };
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch {}
  try { window.dispatchEvent(new CustomEvent(PREVIEW_EVENT, { detail: payload })); } catch {}
  try { const channel = new BroadcastChannel(PREVIEW_CHANNEL); channel.postMessage(payload); channel.close(); } catch {}
}

const HOOK_KEY = "jake_cc_netlify_build_hook";
const SITE_KEY = "jake_cc_public_site_url";
const BRANCH_KEY = "jake_cc_branch_label";
const HISTORY_KEY = "jake_cc_deploy_history";

function safeJsonParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
function readDashboardSnapshot() {
  if (typeof window === "undefined") return null;
  try { return safeJsonParse(window.localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
function load(key, fallback = "") {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v;
  } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch { return []; }
}
function saveHistory(items) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 12))); } catch {}
}
function looksLikeRealHook(url) {
  return /^https:\/\/api\.netlify\.com\/build_hooks\/[A-Za-z0-9_-]+/.test((url || "").trim());
}
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
function getStorageBytes() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) || "";
    return new Blob([raw]).size;
  } catch { return 0; }
}
function getViewportLabel() {
  if (typeof window === "undefined") return "Unknown";
  const w = window.innerWidth || 0;
  return w < 768 ? `Mobile · ${w}px` : `Desktop · ${w}px`;
}
function getPathLabel() {
  if (typeof window === "undefined") return "/admin";
  return window.location.pathname || "/admin";
}

function StatCard({ icon: Icon, label, value, detail, glow = "from-cyan-400/25 via-sky-400/10 to-transparent" }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${glow}`} />
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-white/60">{label}</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</div>
          <div className="mt-2 text-sm text-white/55">{detail}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
          <Icon className="h-5 w-5 text-white/85" />
        </div>
      </div>
    </div>
  );
}

function ActionTile({ icon: Icon, title, subtitle, badge, accent, onClick }) {
  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-[30px] border border-white/10 bg-gradient-to-br ${accent} p-6 text-left shadow-[0_20px_60px_rgba(0,0,0,0.35)]`}
      type="button"
    >
      <div className="absolute inset-0 bg-black/35" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-black/25">
            <Icon className="h-7 w-7 text-white" />
          </div>
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/85">{badge}</span>
        </div>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight text-white">{title}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-white/80">{subtitle}</p>
        <div className="mt-5 flex items-center gap-2 text-sm font-medium text-white">
          Open
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </div>
      </div>
    </motion.button>
  );
}

function Panel({ icon: Icon, title, children, className = "", rightSlot = null }) {
  return (
    <section className={`rounded-[30px] border border-white/10 bg-white/[0.045] shadow-[0_14px_44px_rgba(0,0,0,0.35)] backdrop-blur-xl ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
            <Icon className="h-5 w-5 text-white/85" />
          </div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
        </div>
        {rightSlot}
      </div>
      {children}
    </section>
  );
}

function MiniStatus({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3">
      <span className="text-sm text-white/65">{label}</span>
      <span className="text-right text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">{children}</div>;
}

function SoftInput(props) {
  return <input {...props} className={`w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 ${props.className || ""}`} />;
}

function SoftTextarea(props) {
  return <textarea {...props} className={`w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 ${props.className || ""}`} />;
}

function SoftSelect({ options, ...props }) {
  return (
    <select {...props} className={`w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none ${props.className || ""}`}>
      {options.map((option) => <option key={option || "blank"} value={option}>{option || "Select…"}</option>)}
    </select>
  );
}

function SelectedOrCustom(value, customValue) {
  return value === "Other" ? (customValue || "Other") : value;
}

export default function DashboardHome({ navigate }) {
  const [mode, setMode] = useState("command");
  const [snapshot, setSnapshot] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [buildHook, setBuildHook] = useState(() => load(HOOK_KEY, ""));
  const [publicSiteUrl, setPublicSiteUrl] = useState(() => load(SITE_KEY, "https://jakeschultzastrophotography.com"));
  const [branchLabel, setBranchLabel] = useState(() => load(BRANCH_KEY, "main"));
  const [history, setHistory] = useState(() => loadHistory());
  const [deployStatus, setDeployStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const actionsRef = useRef(null);
  const statsRef = useRef(null);
  const deployRef = useRef(null);
  const toolsRef = useRef(null);

  const updateSnapshot = (mutate) => {
    setSnapshot((prev) => {
      const next = withLiveTelescope(safeJsonParse(JSON.stringify(prev || {})));
      mutate(next);
      writeDashboardSnapshot(next);
      return next;
    });
    setNow(new Date());
  };

  useEffect(() => save(HOOK_KEY, buildHook), [buildHook]);
  useEffect(() => save(SITE_KEY, publicSiteUrl), [publicSiteUrl]);
  useEffect(() => save(BRANCH_KEY, branchLabel), [branchLabel]);
  useEffect(() => saveHistory(history), [history]);

  const refreshSnapshot = () => {
    setSnapshot(withLiveTelescope(readDashboardSnapshot()));
    setNow(new Date());
    setHistory(loadHistory());
  };

  useEffect(() => {
    refreshSnapshot();
    const timer = setInterval(() => setNow(new Date()), 30000);
    const onFocus = () => refreshSnapshot();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const hookReady = useMemo(() => looksLikeRealHook(buildHook), [buildHook]);
  const localPreviewUrl = typeof window !== "undefined" ? `${window.location.origin}/` : "http://localhost:5173/";

  const stats = useMemo(() => {
    const cfg = snapshot;
    const posts = Array.isArray(cfg?.latestNews) ? cfg.latestNews : [];
    const published = posts.filter((p) => (p?.status || "published") !== "draft").length;
    const drafts = posts.filter((p) => (p?.status || "published") === "draft").length;
    const sections = cfg?.sections ? Object.values(cfg.sections) : [];
    const mobileEnabled = sections.filter((s) => s?.enabled?.mobile !== false).length;
    const desktopEnabled = sections.filter((s) => s?.enabled?.desktop !== false).length;
    const updatedAt = cfg?.updatedAt ? new Date(cfg.updatedAt) : null;
    const storageMode = cfg?.persistence?.mode || "localStorage";
    const themePreset = cfg?.theme?.preset || "Not set";
    return {
      published,
      drafts,
      mobileEnabled,
      desktopEnabled,
      storageMode,
      storageSize: formatBytes(getStorageBytes()),
      themePreset,
      currentPath: getPathLabel(),
      updatedLabel:
        updatedAt && !Number.isNaN(updatedAt.getTime())
          ? updatedAt.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
          : "No saved config yet",
      viewport: getViewportLabel(),
      configLoaded: !!cfg,
    };
  }, [snapshot, now]);

  const liveCfg = withLiveTelescope(snapshot).liveTelescope;
  const liveTarget = liveCfg.currentTarget || {};
  const liveEquipment = liveCfg.equipment || {};
  const liveStatus = liveCfg.status || "offline";
  const liveTargetInfo = liveCfg.targetInfo || {};
  const liveSky = liveCfg.skyConditions || {};
  const liveWhere = liveCfg.whereToLook || {};
  const liveProgress = liveCfg.imageProgress || {};
  const targetActive = Boolean((liveTarget.name || liveTarget.constellation || liveTarget.objectType || liveTarget.description || "").trim());
  const equipmentSummary = [
    SelectedOrCustom(liveEquipment.telescope, liveEquipment.telescopeCustom),
    SelectedOrCustom(liveEquipment.mount, liveEquipment.mountCustom),
    SelectedOrCustom(liveEquipment.mainCamera, liveEquipment.mainCameraCustom),
  ].filter(Boolean).join(" • ");
  const whereToLookSummary = [
    liveWhere.pointedNear ? `Currently pointed near ${liveWhere.pointedNear}` : "",
    liveWhere.direction ? `toward the ${liveWhere.direction}` : "",
    liveWhere.altitude ? `at about ${liveWhere.altitude}` : "",
  ].filter(Boolean).join(" ") || "Add a target area, direction, and altitude to preview where viewers should look.";

  const scrollToRef = (ref) => ref?.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const deployNow = async () => {
    if (!hookReady) {
      setDeployStatus("Add a real Netlify build hook URL first.");
      return;
    }
    const proceed = window.confirm(
      `Trigger a live Netlify deploy for ${SITE_VERSION}?

This rebuilds the code already on your ${branchLabel} branch. Make sure your latest files are pushed to GitHub first.`
    );
    if (!proceed) return;
    setBusy(true);
    setDeployStatus("Triggering Netlify build hook...");
    try {
      const res = await fetch(buildHook.trim(), { method: "POST", mode: "cors" });
      const ok = res.ok;
      const entry = {
        id: `${Date.now()}`,
        at: new Date().toISOString(),
        version: SITE_VERSION,
        branch: branchLabel,
        status: ok ? "queued" : `failed (${res.status})`,
      };
      const nextHistory = [entry, ...history].slice(0, 12);
      setHistory(nextHistory);
      setDeployStatus(ok ? "Deploy request sent. Netlify should start building in a moment." : `Netlify returned ${res.status}.`);
    } catch {
      const entry = {
        id: `${Date.now()}`,
        at: new Date().toISOString(),
        version: SITE_VERSION,
        branch: branchLabel,
        status: "failed (network)",
      };
      setHistory((prev) => [entry, ...prev].slice(0, 12));
      setDeployStatus("Deploy request failed. Check the build hook URL and try again.");
    } finally {
      setBusy(false);
    }
  };

  const useRecommended = () => {
    setPublicSiteUrl("https://jakeschultzastrophotography.com");
    setBranchLabel("main");
    setDeployStatus("Recommended defaults applied.");
  };

  const copyReleaseCommand = async () => {
    const command = [
      "git checkout dev",
      "git add .",
      `git commit -m "Release ${SITE_VERSION}"`,
      "git push origin dev",
      "git checkout main",
      "git pull origin main",
      "git merge dev",
      "git push origin main",
    ].join("; ");
    try {
      await navigator.clipboard.writeText(command);
      setDeployStatus("Release command copied. Paste it into PowerShell, let Git finish, then click Deploy.");
    } catch {
      setDeployStatus("Could not copy the release command.");
    }
  };

  const activityFeed = [
    { time: "Editor", title: "Launch editor workspace", detail: "Open the main builder with canvas, sections, theme, news, and persistence tools.", action: () => navigate("/admin/editor") },
    { time: "Publishing", title: "Create or edit a Latest News post", detail: "Jump directly to the news tab so you can draft or update a post faster.", action: () => navigate("/admin/news") },
    { time: "Theme", title: "Open theme controls", detail: "Go straight to color, font, and token-level tuning for the site system.", action: () => navigate("/admin/theme") },
    { time: "Assets", title: "Manage section visuals", detail: "Open the sections side of the editor for background images and section-level styling.", action: () => navigate("/admin/sections") },
  ];

  const quickTools = [
    ["Open live website", () => window.open(publicSiteUrl || "/", "_blank"), ExternalLink],
    ["Open localhost preview", () => window.open(localPreviewUrl, "_blank"), Monitor],
    ["Open editor canvas", () => navigate("/admin/editor"), ArrowRight],
    ["Jump to latest news", () => navigate("/admin/news"), ArrowRight],
    ["Open theme controls", () => navigate("/admin/theme"), Palette],
    ["Open persistence panel", () => navigate("/admin/persistence"), Database],
    ["Manage section imagery", () => navigate("/admin/sections"), ImageIcon],
  ];

  const railButtons = [
    { icon: Sparkles, label: "Home", action: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
    { icon: PencilRuler, label: "Actions", action: () => scrollToRef(actionsRef) },
    { icon: BarChart3, label: "Stats", action: () => scrollToRef(statsRef) },
    { icon: Rocket, label: "Deploy", action: () => scrollToRef(deployRef) },
    { icon: PanelLeft, label: "Tools", action: () => scrollToRef(toolsRef) },
    { icon: RefreshCcw, label: "Refresh", action: refreshSnapshot },
  ];

  const commandCards = mode === "studio"
    ? [
        { icon: Palette, title: "Theme Lab", subtitle: "Tune the site look and feel with color, font, and surface controls.", badge: "Style", accent: "from-emerald-300/30 via-cyan-500/16 to-sky-700/10", onClick: () => navigate("/admin/theme") },
        { icon: ImageIcon, title: "Sections", subtitle: "Manage hero assets, backgrounds, and section imagery.", badge: "Assets", accent: "from-violet-400/28 via-purple-500/16 to-indigo-600/10", onClick: () => navigate("/admin/sections") },
        { icon: Database, title: "Persistence", subtitle: "Export, import, or review how the config is being stored right now.", badge: "Save", accent: "from-amber-300/30 via-yellow-500/16 to-orange-600/10", onClick: () => navigate("/admin/persistence") },
        { icon: Globe, title: "View Site", subtitle: "Check the current public experience after making visual adjustments.", badge: "Live", accent: "from-cyan-400/30 via-sky-500/16 to-blue-700/10", onClick: () => window.open(publicSiteUrl || "/", "_blank") },
      ]
    : [
        { icon: Globe, title: "View Site", subtitle: "Open the live public website and inspect the current experience.", badge: "Live", accent: "from-cyan-400/30 via-sky-500/16 to-blue-700/10", onClick: () => window.open(publicSiteUrl || "/", "_blank") },
        { icon: Monitor, title: "Local Preview", subtitle: "Open your current localhost preview in a new tab so you can compare changes before going live.", badge: "Local", accent: "from-cyan-300/26 via-teal-500/14 to-sky-700/10", onClick: () => window.open(localPreviewUrl, "_blank") },
        { icon: PencilRuler, title: "Go to Editor", subtitle: "Open the site builder workbench for layout, sections, theme, and persistence.", badge: "Workbench", accent: "from-amber-300/30 via-yellow-500/16 to-orange-600/10", onClick: () => navigate("/admin/editor") },
        { icon: FilePlus2, title: "Make a Post", subtitle: "Jump straight into the Latest News tools so you can draft your next post faster.", badge: "Publish", accent: "from-fuchsia-400/28 via-pink-500/16 to-rose-600/10", onClick: () => navigate("/admin/news") },
        { icon: ImageIcon, title: "Media & Sections", subtitle: "Open the section editor for image paths, backgrounds, and layout visuals.", badge: "Assets", accent: "from-violet-400/28 via-purple-500/16 to-indigo-600/10", onClick: () => navigate("/admin/sections") },
      ];

  const telemetryBars = [
    snapshot ? stats.desktopEnabled * 8 : 22,
    snapshot ? stats.mobileEnabled * 8 : 28,
    snapshot ? Math.max(16, stats.published * 14) : 18,
    snapshot ? Math.max(14, stats.drafts * 14) : 12,
    snapshot ? 60 : 24,
    snapshot ? Math.min(92, Math.max(20, Math.round((getStorageBytes() / 1024) * 1.3))) : 20,
    snapshot ? 74 : 26,
  ];

  return (
    <div className="min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.12),transparent_22%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:40px_40px]" />
      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-[94px] flex-col border-r border-white/10 bg-black/20 px-3 py-5 backdrop-blur-xl lg:flex">
          <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/10 bg-white/5 text-lg font-semibold shadow-xl">JS</div>
          <div className="mt-6 flex flex-1 flex-col gap-3">
            {railButtons.map(({ icon: Icon, label, action }) => (
              <button key={label} onClick={action} className="group flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.08]" title={label}>
                <Icon className="h-5 w-5 text-slate-200 transition group-hover:scale-110" />
              </button>
            ))}
          </div>
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-3 text-center text-[11px] text-slate-300">{SITE_VERSION}</div>
        </aside>

        <main className="flex-1 px-4 py-4 md:px-6 md:py-6 xl:px-8">
          <div className="mx-auto flex max-w-[1650px] flex-col gap-6">
            <header className="rounded-[30px] border border-white/10 bg-black/20 px-5 py-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl md:px-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em] text-slate-300">
                    <Star className="h-3.5 w-3.5" /> Command Center
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Welcome to your website command center.</h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">This is the full admin home again: launch actions, stats, recent activity, quick tools, and the deploy panel all in one place.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {[["command","Command Mode"],["studio","Studio Mode"]].map(([value,label]) => (
                    <button key={value} onClick={() => setMode(value)} className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${mode === value ? "border-amber-300/50 bg-amber-300/15 text-white" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}>{label}</button>
                  ))}
                </div>
              </div>
            </header>

            <section ref={actionsRef} className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <Panel title="Launch Actions" icon={Sparkles}>
                <div className="grid gap-4 p-5 md:grid-cols-2">
                  {commandCards.map((card) => <ActionTile key={card.title} {...card} />)}
                </div>
              </Panel>

              <Panel title="System Snapshot" icon={Activity} rightSlot={<button onClick={refreshSnapshot} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"><RefreshCcw className="h-3.5 w-3.5" /> Refresh</button>}>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <StatCard icon={Eye} label="Published Posts" value={String(stats.published)} detail={`Drafts: ${stats.drafts}`} />
                  <StatCard icon={ShieldCheck} label="Storage Mode" value={stats.storageMode} detail={stats.storageSize} glow="from-emerald-400/25 via-teal-400/10 to-transparent" />
                  <StatCard icon={Monitor} label="Desktop Sections" value={String(stats.desktopEnabled)} detail={stats.viewport} glow="from-violet-400/25 via-indigo-400/10 to-transparent" />
                  <StatCard icon={Smartphone} label="Mobile Sections" value={String(stats.mobileEnabled)} detail={stats.updatedLabel} glow="from-amber-300/25 via-orange-400/10 to-transparent" />
                </div>
              </Panel>
            </section>

            <section ref={statsRef} className="grid gap-5 2xl:grid-cols-[0.95fr_0.7fr_0.7fr] xl:grid-cols-[1fr_1fr]">
              <Panel title="Recent Activity" icon={Clock3} className="2xl:col-span-1 xl:col-span-2">
                <div className="p-5">
                  <div className="space-y-4">
                    {activityFeed.map((item, i) => (
                      <button key={`${item.title}-${i}`} onClick={item.action} className="w-full rounded-[24px] border border-white/10 bg-black/20 p-4 text-left transition hover:bg-white/5">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.time}</div>
                        <div className="mt-2 text-lg font-semibold text-white">{item.title}</div>
                        <p className="mt-1 text-sm leading-6 text-slate-300">{item.detail}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </Panel>

              <Panel title="Site Systems" icon={Server}>
                <div className="space-y-3 p-5">
                  <MiniStatus label="Public site" value="Online" />
                  <MiniStatus label="Command center" value="Ready" />
                  <MiniStatus label="Theme preset" value={stats.themePreset} />
                  <MiniStatus label="Current route" value={stats.currentPath} />
                </div>
              </Panel>

              <Panel title="Builder Storage" icon={HardDrive}>
                <div className="space-y-3 p-5">
                  <MiniStatus label="Config saved" value={stats.configLoaded ? "Yes" : "Not yet"} />
                  <MiniStatus label="Local snapshot size" value={stats.storageSize} />
                  <MiniStatus label="Viewport" value={stats.viewport} />
                  <MiniStatus label="Last update" value={stats.updatedLabel} />
                </div>
              </Panel>
            </section>

            {mode === "studio" ? (
              <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
                <Panel title="Live Telescope Studio HUD" icon={Camera}>
                  <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.1fr)_380px]">
                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-[0_18px_60px_rgba(0,0,0,0.45)]">
                        <div className="aspect-video w-full">
                          <iframe
                            title="Jake Schultz Astrophotography live telescope stream"
                            src={YOUTUBE_LIVE_EMBED_URL}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="h-full w-full border-0"
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-white/45">Status</div>
                          <div className="mt-2 text-sm leading-6 text-white/85">{liveStatus === "live" ? "Live now" : liveStatus === "startingSoon" ? "Starting soon" : "Offline"}</div>
                        </div>
                        <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-white/45">Projected next stream</div>
                          <div className="mt-2 text-sm leading-6 text-white/85">{liveCfg.projectedNextStream || "—"}</div>
                        </div>
                        <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-white/45">Current target</div>
                          <div className="mt-2 text-sm leading-6 text-white/85">{targetActive ? `${liveTarget.name || "Untitled target"}${liveTarget.constellation ? ` • ${liveTarget.constellation}` : ""}` : "Blank until you set a live target."}</div>
                        </div>
                        <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-white/45">Equipment tonight</div>
                          <div className="mt-2 text-sm leading-6 text-white/85">{equipmentSummary || "Select gear below."}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button onClick={() => navigate("/live-telescope")} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15"><Eye className="h-4 w-4" /> Open live page</button>
                        <button onClick={() => window.open(YOUTUBE_CHANNEL_URL, "_blank") } className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"><ExternalLink className="h-4 w-4" /> Open YouTube channel</button>
                        <button onClick={() => navigate("/admin/live")} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10"><PencilRuler className="h-4 w-4" /> Open full live editor</button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                        <FieldLabel>Stream status</FieldLabel>
                        <SoftSelect
                          value={liveStatus}
                          options={["offline", "startingSoon", "live"]}
                          onChange={(e) => updateSnapshot((next) => {
                            next.liveTelescope = next.liveTelescope || makeDefaultLiveTelescope();
                            next.liveTelescope.status = e.target.value;
                          })}
                        />
                      </div>

                      <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                        <FieldLabel>Projected next stream</FieldLabel>
                        <SoftInput
                          value={liveCfg.projectedNextStream || ""}
                          onChange={(e) => updateSnapshot((next) => {
                            next.liveTelescope = next.liveTelescope || makeDefaultLiveTelescope();
                            next.liveTelescope.projectedNextStream = e.target.value;
                          })}
                          placeholder="Clear evenings after dark, weather permitting."
                        />
                      </div>

                      <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                        <FieldLabel>Ask Jake text</FieldLabel>
                        <SoftTextarea rows={3} value={liveCfg.askJakeText || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.askJakeText = e.target.value; })} placeholder="Invite viewers to ask questions in chat." />
                      </div>

                      <div className="rounded-[26px] border border-white/10 bg-black/20 p-4">
                        <div className="mb-3 text-sm font-semibold text-white">Current Target</div>
                        <div className="grid gap-3">
                          <div>
                            <FieldLabel>Target name</FieldLabel>
                            <SoftInput value={liveTarget.name || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.currentTarget.name = e.target.value; })} placeholder="M42, Jupiter, Rosette Nebula…" />
                          </div>
                          <div>
                            <FieldLabel>Constellation</FieldLabel>
                            <SoftInput value={liveTarget.constellation || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.currentTarget.constellation = e.target.value; })} placeholder="Orion" />
                          </div>
                          <div>
                            <FieldLabel>Object type</FieldLabel>
                            <SoftInput value={liveTarget.objectType || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.currentTarget.objectType = e.target.value; })} placeholder="Nebula, galaxy, planet…" />
                          </div>
                          <div>
                            <FieldLabel>Short description</FieldLabel>
                            <SoftTextarea rows={3} value={liveTarget.description || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.currentTarget.description = e.target.value; })} placeholder="Optional note about tonight's session." />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Equipment Tonight" icon={Database}>
                  <div className="grid gap-4 p-5 md:grid-cols-2">
                    {[
                      ["telescope", "Telescope"],
                      ["mount", "Mount"],
                      ["mainCamera", "Main Camera"],
                      ["guideCamera", "Guide Camera"],
                      ["filter", "Filter"],
                      ["software", "Software"],
                    ].map(([key, label]) => {
                      const customKey = `${key}Custom`;
                      return (
                        <div key={key} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                          <FieldLabel>{label}</FieldLabel>
                          <SoftSelect
                            value={liveEquipment[key] || ""}
                            options={STREAM_GEAR_OPTIONS[key] || [""]}
                            onChange={(e) => updateSnapshot((next) => {
                              next.liveTelescope.equipment[key] = e.target.value;
                              next.liveTelescope.equipment[customKey] = e.target.value === "Other" ? (next.liveTelescope.equipment[customKey] || "") : "";
                            })}
                          />
                          {(liveEquipment[key] || "") === "Other" ? (
                            <div className="mt-3">
                              <SoftInput
                                value={liveEquipment[customKey] || ""}
                                onChange={(e) => updateSnapshot((next) => { next.liveTelescope.equipment[customKey] = e.target.value; })}
                                placeholder={`Custom ${String(label).toLowerCase()}`}
                              />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </Panel>

                <Panel title="Where to Look in the Sky" icon={Compass}>
                  <div className="grid gap-4 p-5 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 space-y-3">
                      <div className="text-sm font-semibold text-white">Mini sky pointer</div>
                      <SoftInput value={liveWhere.pointedNear || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.whereToLook.pointedNear = e.target.value; })} placeholder="Currently pointed near" />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <SoftSelect value={liveWhere.direction || ""} options={["", "N", "NE", "E", "SE", "S", "SW", "W", "NW"]} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.whereToLook.direction = e.target.value; })} />
                        <SoftInput value={liveWhere.altitude || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.whereToLook.altitude = e.target.value; })} placeholder="Altitude" />
                      </div>
                      <SoftInput value={liveWhere.constellation || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.whereToLook.constellation = e.target.value; })} placeholder="Constellation" />
                      <SoftTextarea rows={3} value={liveWhere.note || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.whereToLook.note = e.target.value; })} placeholder="Viewer note" />
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">Preview</div>
                          <div className="mt-1 text-xs text-white/55">Quick summary for the public live page.</div>
                        </div>
                        <Compass className="h-5 w-5 text-white/45" />
                      </div>
                      <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Where to look</div>
                        <div className="mt-2 text-sm leading-6 text-white/85">{whereToLookSummary}</div>
                        {liveWhere.constellation ? <div className="mt-3 text-xs text-white/55">Constellation: <span className="text-white/80">{liveWhere.constellation}</span></div> : null}
                        {liveWhere.note ? <div className="mt-3 text-sm leading-6 text-white/70">{liveWhere.note}</div> : null}
                      </div>
                    </div>
                  </div>
                </Panel>

                <Panel title="Sky + Progress" icon={BarChart3}>
                  <div className="grid gap-4 p-5 md:grid-cols-2">
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 space-y-3">
                      <div className="text-sm font-semibold text-white">Sky conditions</div>
                      <SoftInput value={liveSky.cloudCover || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.skyConditions.cloudCover = e.target.value; })} placeholder="Cloud cover" />
                      <SoftInput value={liveSky.transparency || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.skyConditions.transparency = e.target.value; })} placeholder="Transparency" />
                      <SoftInput value={liveSky.seeing || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.skyConditions.seeing = e.target.value; })} placeholder="Seeing" />
                      <SoftInput value={liveSky.moonPhase || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.skyConditions.moonPhase = e.target.value; })} placeholder="Moon phase" />
                      <SoftInput value={liveSky.wind || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.skyConditions.wind = e.target.value; })} placeholder="Wind" />
                    </div>
                    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 space-y-3">
                      <div className="text-sm font-semibold text-white">Image progress</div>
                      <SoftInput value={liveProgress.subsCaptured || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.imageProgress.subsCaptured = e.target.value; })} placeholder="Subs captured" />
                      <SoftInput value={liveProgress.exposureLength || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.imageProgress.exposureLength = e.target.value; })} placeholder="Exposure length" />
                      <SoftInput value={liveProgress.totalIntegration || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.imageProgress.totalIntegration = e.target.value; })} placeholder="Total integration" />
                      <SoftInput value={liveProgress.currentFilter || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.imageProgress.currentFilter = e.target.value; })} placeholder="Current filter" />
                      <SoftInput value={liveProgress.guidingStable || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.imageProgress.guidingStable = e.target.value; })} placeholder="Guiding stable" />
                    </div>
                  </div>
                </Panel>

                <Panel title="Target Info Card" icon={Star}>
                  <div className="grid gap-4 p-5">
                    <SoftInput value={liveTargetInfo.title || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.targetInfo.title = e.target.value; })} placeholder="Card title" />
                    <SoftTextarea rows={4} value={liveTargetInfo.summary || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.targetInfo.summary = e.target.value; })} placeholder="Educational note about the target" />
                    <SoftInput value={liveTargetInfo.astrobinUrl || ""} onChange={(e) => updateSnapshot((next) => { next.liveTelescope.targetInfo.astrobinUrl = e.target.value; })} placeholder="Optional AstroBin or related URL" />
                  </div>
                </Panel>
              </section>
            ) : null}

            <section ref={deployRef} className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
              <Panel title="Deploy Center" icon={Rocket}>
                <div className="space-y-4 p-5">
                  <div className="rounded-[26px] border border-white/10 bg-black/20 px-5 py-4 text-right">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/45">Release queued</div>
                    <div className="mt-2 text-4xl font-semibold tracking-tight">{SITE_VERSION}</div>
                    <div className="mt-2 text-sm text-white/65">{RELEASE_NAME}</div>
                    <div className="text-sm text-white/45">Release date: {RELEASE_DATE}</div>
                  </div>
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">Public site URL</div>
                    <input value={publicSiteUrl} onChange={(e) => setPublicSiteUrl(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" placeholder="https://jakeschultzastrophotography.com" />
                  </div>
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">Netlify build hook URL</div>
                    <input value={buildHook} onChange={(e) => setBuildHook(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" placeholder="https://api.netlify.com/build_hooks/..." />
                    {!hookReady ? (
                      <div className="mt-2 flex items-center gap-2 text-sm text-amber-300/85"><AlertTriangle className="h-4 w-4" /> Add your real Netlify build hook URL here.</div>
                    ) : (
                      <div className="mt-2 flex items-center gap-2 text-sm text-emerald-300/85"><CheckCircle2 className="h-4 w-4" /> Build hook looks valid.</div>
                    )}
                  </div>
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/45">Branch label</div>
                    <input value={branchLabel} onChange={(e) => setBranchLabel(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30" placeholder="main" />
                  </div>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <button onClick={deployNow} disabled={busy || !hookReady} className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />} Deploy {SITE_VERSION}</button>
                    <button onClick={useRecommended} className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Use recommended defaults</button>
                    <button onClick={copyReleaseCommand} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"><Copy className="h-4 w-4" /> Copy release command</button>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white/60"><strong className="text-white/80">Step 1:</strong> click <span className="text-white/80">Copy release command</span>. <strong className="text-white/80">Step 2:</strong> paste it into Windows PowerShell and press Enter. <strong className="text-white/80">Step 3:</strong> wait until Git finishes pushing to <span className="text-white/80">main</span>. <strong className="text-white/80">Step 4:</strong> come back here and click <span className="text-white/80">Deploy</span>. The deploy button rebuilds the code already on your connected Git branch; it does not upload unsaved local code by itself.</div>
                  {deployStatus ? <div className="text-sm text-cyan-200/85">{deployStatus}</div> : null}
                </div>
              </Panel>

              <Panel title="Deploy History" icon={Layers3}>
                <div className="p-5">
                  {history.length ? (
                    <div className="space-y-3">
                      {history.map((item) => (
                        <div key={item.id} className="rounded-[20px] border border-white/10 bg-black/20 px-4 py-3">
                          <div className="flex items-center justify-between gap-4 text-sm">
                            <span className="font-medium text-white">{item.version}</span>
                            <span className="text-white/50">{item.branch}</span>
                          </div>
                          <div className="mt-1 text-sm text-white/65">{item.status}</div>
                          <div className="mt-1 text-xs text-white/45">{new Date(item.at).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm text-white/60">No deploys recorded yet from this browser.</div>
                  )}
                </div>
              </Panel>
            </section>

            <section ref={toolsRef} className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
              <Panel title="Quick Tools" icon={PanelLeft}>
                <div className="grid gap-3 p-5">
                  {quickTools.map(([label, action, Icon]) => (
                    <button key={label} onClick={action} className="flex items-center justify-between rounded-[22px] border border-white/10 bg-black/20 px-4 py-3.5 text-left text-sm text-white transition hover:bg-white/10">
                      <span>{label}</span>
                      <Icon className="h-4 w-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel title="Analytics Preview" icon={BarChart3}>
                <div className="p-5">
                  <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="text-sm text-slate-300">Builder telemetry</div>
                        <div className="mt-1 text-2xl font-semibold">Status at a glance</div>
                      </div>
                      <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">Active</div>
                    </div>
                    <div className="mt-6 flex h-48 items-end gap-3">
                      {telemetryBars.map((h, idx) => (
                        <div key={idx} className="flex flex-1 flex-col items-center gap-2">
                          <div className="w-full rounded-t-2xl bg-gradient-to-t from-cyan-500/70 to-sky-300/80 shadow-[0_0_20px_rgba(56,189,248,0.25)]" style={{ height: `${h * 1.7}px` }} />
                          <div className="text-xs text-slate-400">{["Desk","Mob","Pub","Draft","Path","Store","Cfg"][idx]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
