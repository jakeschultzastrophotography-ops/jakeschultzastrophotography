import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  ExternalLink,
  Eye,
  FilePlus2,
  Image as ImageIcon,
  Link as LinkIcon,
  Pin,
  Save,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";

const STORAGE_KEY = "jake_site_builder_v2";
const DEFAULT_CANONICAL = "https://jakeschultzastrophotography.com";

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function uid(prefix = "post") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function emptyPost() {
  return {
    id: uid("post"),
    title: "",
    date: todayLabel(),
    image: "",
    href: "/",
    external: false,
    shareHref: "",
    description: "",
    cta: "Open",
    mediaFit: "contain",
    pinned: false,
    status: "draft",
    socialCaption: "",
    astrobinUrl: "",
    tags: "",
  };
}

function loadConfig() {
  const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
  const cfg = safeJsonParse(raw || "");
  if (cfg && cfg.version === 2) return cfg;
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    latestNews: [],
    canonicalOrigin: DEFAULT_CANONICAL,
    integrations: { siteUrl: "/" },
  };
}

function saveConfig(cfg) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...cfg,
      updatedAt: new Date().toISOString(),
    })
  );
}

function buildShareHref(post, canonicalOrigin) {
  const raw = (post.shareHref || post.href || "").trim();
  if (!raw) return canonicalOrigin || DEFAULT_CANONICAL;
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = (canonicalOrigin || DEFAULT_CANONICAL).replace(/\/$/, "");
  return `${base}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function fieldClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white/90 outline-none transition focus:border-cyan-300/30 focus:bg-black/40";
}

function areaClass() {
  return "w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-white/90 outline-none transition focus:border-cyan-300/30 focus:bg-black/40";
}

function Panel({ title, icon: Icon, children, right }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Icon className="h-5 w-5 text-slate-100" />
          </div>
          <div className="text-base font-semibold text-white">{title}</div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <div className="mb-1.5 text-xs uppercase tracking-[0.2em] text-white/45">{children}</div>;
}

export default function PostStudio({ onBack, onOpenEditor, onViewSite }) {
  const [cfg, setCfg] = useState(() => loadConfig());
  const [selectedId, setSelectedId] = useState(() => {
    const initial = loadConfig();
    return initial.latestNews?.[0]?.id || null;
  });
  const [draft, setDraft] = useState(() => {
    const initial = loadConfig();
    return initial.latestNews?.[0] ? { ...initial.latestNews[0] } : emptyPost();
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setMessage(""), 2600);
    return () => clearTimeout(timer);
  }, [message]);

  const posts = useMemo(() => {
    const list = Array.isArray(cfg?.latestNews) ? cfg.latestNews.slice() : [];
    list.sort((a, b) => {
      const ap = a?.pinned ? 1 : 0;
      const bp = b?.pinned ? 1 : 0;
      if (bp !== ap) return bp - ap;
      return String(b?.date || "").localeCompare(String(a?.date || ""));
    });
    return list;
  }, [cfg]);

  useEffect(() => {
    if (!selectedId && posts[0]?.id) {
      setSelectedId(posts[0].id);
      setDraft({ ...posts[0] });
    }
  }, [posts, selectedId]);

  const canonicalOrigin = cfg?.canonicalOrigin || DEFAULT_CANONICAL;
  const inferredSlug = useMemo(() => slugify(draft.title || draft.cta || draft.date || "post"), [draft.title, draft.cta, draft.date]);
  const computedShareHref = buildShareHref(
    {
      ...draft,
      shareHref: draft.shareHref || (inferredSlug ? `/news/${inferredSlug}` : draft.href || "/"),
    },
    canonicalOrigin
  );

  const loadIntoEditor = (post) => {
    setSelectedId(post.id);
    setDraft({ ...post });
  };

  const resetNew = () => {
    const next = emptyPost();
    if (!next.shareHref && next.title) next.shareHref = `/news/${slugify(next.title)}`;
    setSelectedId(null);
    setDraft(next);
    setMessage("New post draft ready.");
  };

  const writePost = (statusOverride) => {
    const nextCfg = { ...cfg, latestNews: Array.isArray(cfg.latestNews) ? cfg.latestNews.slice() : [] };
    const postToSave = {
      ...draft,
      id: draft.id || uid("post"),
      title: (draft.title || "Untitled post").trim(),
      date: (draft.date || todayLabel()).trim(),
      cta: (draft.cta || "Open").trim(),
      href: (draft.href || "/").trim(),
      shareHref: (draft.shareHref || (inferredSlug ? `/news/${inferredSlug}` : draft.href || "/")).trim(),
      mediaFit: draft.mediaFit || "contain",
      status: statusOverride || draft.status || "draft",
      socialCaption: (draft.socialCaption || draft.description || "").trim(),
      astrobinUrl: (draft.astrobinUrl || "").trim(),
      tags: (draft.tags || "").trim(),
    };

    const idx = nextCfg.latestNews.findIndex((p) => p.id === postToSave.id);
    if (idx >= 0) nextCfg.latestNews[idx] = postToSave;
    else nextCfg.latestNews.unshift(postToSave);

    saveConfig(nextCfg);
    setCfg(loadConfig());
    setSelectedId(postToSave.id);
    setDraft(postToSave);
    setMessage(statusOverride === "published" ? "Post published to dashboard config." : "Draft saved to dashboard config.");
  };

  const deleteSelected = () => {
    if (!draft?.id) return;
    const nextCfg = { ...cfg, latestNews: (cfg.latestNews || []).filter((p) => p.id !== draft.id) };
    saveConfig(nextCfg);
    setCfg(loadConfig());
    const fallback = nextCfg.latestNews?.[0] || emptyPost();
    setSelectedId(nextCfg.latestNews?.[0]?.id || null);
    setDraft({ ...fallback });
    setMessage("Post removed.");
  };

  const duplicateDraft = () => {
    const copy = {
      ...draft,
      id: uid("post"),
      title: draft.title ? `${draft.title} Copy` : "Untitled post copy",
      status: "draft",
      pinned: false,
    };
    setSelectedId(null);
    setDraft(copy);
    setMessage("Draft duplicated.");
  };

  const copyShareText = async () => {
    const text = `${draft.title || "Untitled post"}\n\n${(draft.socialCaption || draft.description || "").trim()}\n\n${computedShareHref}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Share caption copied.");
    } catch {
      setMessage("Could not copy automatically.");
    }
  };

  const analyticsHint = cfg?.integrations?.analyticsUrl ? "Analytics feed connected in command center." : "Connect analytics later in Save to complete the publishing pipeline.";

  return (
    <div className="min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.12),transparent_24%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1700px] flex-col gap-5 px-4 py-4 md:px-6 md:py-6 xl:px-8">
        <header className="rounded-[30px] border border-white/10 bg-black/20 px-5 py-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl md:px-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em] text-slate-300">
                <Sparkles className="h-3.5 w-3.5" />
                Post Studio
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Create and publish posts from one place.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                This is now a real composing workspace instead of just a jump to the news tab. Build the post, preview it, save it into your dashboard config, and then open the editor or site when you are ready.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={onBack} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10">
                <ArrowLeft className="h-4 w-4" /> Back to Command Center
              </button>
              <button onClick={onOpenEditor} className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-300/15">
                <ExternalLink className="h-4 w-4" /> Open Editor
              </button>
            </div>
          </div>
        </header>

        {message ? (
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[340px_1.1fr_0.9fr]">
          <Panel
            title="Post Library"
            icon={FilePlus2}
            right={
              <button onClick={resetNew} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10">
                <FilePlus2 className="h-3.5 w-3.5" /> New
              </button>
            }
          >
            <div className="p-4">
              <div className="mb-3 text-sm text-white/60">Saved posts in your builder config</div>
              <div className="space-y-2">
                {posts.length ? posts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => loadIntoEditor(post)}
                    className={`w-full rounded-[22px] border px-4 py-3 text-left transition ${selectedId === post.id ? "border-cyan-300/30 bg-cyan-400/10" : "border-white/10 bg-black/20 hover:bg-white/5"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-sm font-semibold text-white">{post.title || "Untitled post"}</div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">{post.status || "published"}</div>
                    </div>
                    <div className="mt-1 text-xs text-white/45">{post.date || "No date"}{post.pinned ? " • pinned" : ""}</div>
                  </button>
                )) : (
                  <div className="rounded-[22px] border border-dashed border-white/15 bg-black/20 px-4 py-6 text-sm text-white/50">No saved posts yet. Start with a new draft.</div>
                )}
              </div>
            </div>
          </Panel>

          <Panel
            title="Composer"
            icon={Save}
            right={
              <div className="flex flex-wrap gap-2">
                <button onClick={duplicateDraft} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white hover:bg-white/10">
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </button>
                <button onClick={deleteSelected} className="inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-100 hover:bg-rose-400/15">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            }
          >
            <div className="grid gap-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Title</Label>
                  <input className={fieldClass()} value={draft.title || ""} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} placeholder="Markarian's Chain" />
                </div>
                <div>
                  <Label>Date</Label>
                  <input className={fieldClass()} value={draft.date || ""} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} placeholder="Mar 5, 2026" />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <Label>Status</Label>
                  <select className={fieldClass()} value={draft.status || "draft"} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                    <option value="draft">draft</option>
                    <option value="published">published</option>
                  </select>
                </div>
                <div>
                  <Label>CTA</Label>
                  <input className={fieldClass()} value={draft.cta || ""} onChange={(e) => setDraft((d) => ({ ...d, cta: e.target.value }))} placeholder="View on AstroBin" />
                </div>
                <div>
                  <Label>Media fit</Label>
                  <select className={fieldClass()} value={draft.mediaFit || "contain"} onChange={(e) => setDraft((d) => ({ ...d, mediaFit: e.target.value }))}>
                    <option value="contain">contain</option>
                    <option value="cover">cover</option>
                  </select>
                </div>
                <div>
                  <Label>Pinned</Label>
                  <label className="flex h-11 items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white/85">
                    <span>Feature this post</span>
                    <input type="checkbox" checked={!!draft.pinned} onChange={(e) => setDraft((d) => ({ ...d, pinned: e.target.checked }))} />
                  </label>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Image path or URL</Label>
                  <input className={fieldClass()} value={draft.image || ""} onChange={(e) => setDraft((d) => ({ ...d, image: e.target.value }))} placeholder="/images/news/markarians-chain.jpg" />
                </div>
                <div>
                  <Label>Destination URL</Label>
                  <input className={fieldClass()} value={draft.href || ""} onChange={(e) => setDraft((d) => ({ ...d, href: e.target.value }))} placeholder="https://app.astrobin.com/..." />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Share URL</Label>
                  <input className={fieldClass()} value={draft.shareHref || ""} onChange={(e) => setDraft((d) => ({ ...d, shareHref: e.target.value }))} placeholder={`/news/${inferredSlug || "your-post-slug"}`} />
                </div>
                <div>
                  <Label>AstroBin URL</Label>
                  <input className={fieldClass()} value={draft.astrobinUrl || ""} onChange={(e) => setDraft((d) => ({ ...d, astrobinUrl: e.target.value, href: d.href || e.target.value }))} placeholder="https://www.astrobin.com/..." />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Tags</Label>
                  <input className={fieldClass()} value={draft.tags || ""} onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))} placeholder="galaxies, markarian's chain, virgo cluster" />
                </div>
                <div>
                  <Label>External Link</Label>
                  <label className="flex h-11 items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white/85">
                    <span>Open destination in new tab</span>
                    <input type="checkbox" checked={!!draft.external} onChange={(e) => setDraft((d) => ({ ...d, external: e.target.checked }))} />
                  </label>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <textarea className={areaClass()} rows={7} value={draft.description || ""} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Write the main post description..." />
              </div>

              <div>
                <Label>Social caption</Label>
                <textarea className={areaClass()} rows={5} value={draft.socialCaption || ""} onChange={(e) => setDraft((d) => ({ ...d, socialCaption: e.target.value }))} placeholder="Optional Facebook/Instagram share copy..." />
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button onClick={() => writePost("draft")} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10">
                  <Save className="h-4 w-4" /> Save Draft
                </button>
                <button onClick={() => writePost("published")} className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-400/15 px-4 py-3 text-sm font-medium text-white hover:bg-cyan-400/20">
                  <Send className="h-4 w-4" /> Publish to Dashboard
                </button>
                <button onClick={copyShareText} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10">
                  <Copy className="h-4 w-4" /> Copy Share Text
                </button>
                <button onClick={onViewSite} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10">
                  <Eye className="h-4 w-4" /> View Site
                </button>
              </div>
            </div>
          </Panel>

          <div className="grid gap-5">
            <Panel title="Live Card Preview" icon={Eye}>
              <div className="p-5">
                <article className="overflow-hidden rounded-[28px] border border-white/10 bg-black/20">
                  <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                    <div className="min-h-[220px] bg-gradient-to-br from-slate-700 to-slate-950 flex items-center justify-center text-white/35">
                      {draft.image ? (
                        <img src={draft.image} alt={draft.title || "Post preview"} className={`h-full w-full ${draft.mediaFit === "cover" ? "object-cover" : "object-contain"}`} />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-center text-xs uppercase tracking-[0.2em]">
                          <ImageIcon className="h-7 w-7" />
                          No image yet
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/45">
                        <span>{draft.date || todayLabel()}</span>
                        <span>•</span>
                        <span>{draft.status || "draft"}</span>
                        {draft.pinned ? <><span>•</span><span className="text-amber-200">Pinned</span></> : null}
                      </div>
                      <h3 className="mt-3 text-2xl font-semibold text-white">{draft.title || "Untitled post"}</h3>
                      <p className="mt-3 text-sm leading-7 text-white/70">{draft.description || "Your post description will preview here as you write it."}</p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-100">
                          <LinkIcon className="h-3.5 w-3.5" /> {draft.cta || "Open"}
                        </span>
                        {draft.external ? <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70">External link</span> : null}
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </Panel>

            <Panel title="Publishing Details" icon={CalendarDays}>
              <div className="grid gap-3 p-5">
                <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">Computed share URL</div>
                  <div className="mt-2 break-all text-sm text-white/85">{computedShareHref}</div>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">Suggested slug</div>
                  <div className="mt-2 text-sm text-white/85">{inferredSlug || "untitled-post"}</div>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45"><Pin className="h-3.5 w-3.5" /> Promotion notes</div>
                  <div className="mt-2 text-sm leading-6 text-white/75">Use social caption for share copy, AstroBin URL for outbound destination, and pin the post when you want it surfaced first in Latest News.</div>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/45">Pipeline status</div>
                  <div className="mt-2 text-sm leading-6 text-white/75">{analyticsHint}</div>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
