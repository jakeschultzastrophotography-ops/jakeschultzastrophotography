import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  FolderOpen,
  Image as ImageIcon,
  Layers3,
  Link2,
  Monitor,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Server,
  Sparkles,
  Star,
  Trash2,
  Upload,
  WifiOff,
} from "lucide-react";

const STORAGE_KEY = "jake_site_builder_v2";

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function loadConfig() {
  const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
  const cfg = safeJsonParse(raw || "");
  if (cfg && cfg.version === 2) return cfg;
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    sections: {},
    latestNews: [],
    mediaLibrary: { favorites: [], uploads: [], manifestCache: null },
    integrations: { siteUrl: "/", mediaManifestUrl: "/media-manifest.json", mediaBaseUrl: "" },
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

function uid(prefix = "asset") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function fieldClass() {
  return "h-11 w-full rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white/90 outline-none transition focus:border-cyan-300/30 focus:bg-black/40";
}

function Label({ children }) {
  return <div className="mb-1.5 text-xs uppercase tracking-[0.2em] text-white/45">{children}</div>;
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

function previewStyle(path, fit = "cover") {
  if (!path) return { background: "linear-gradient(135deg, rgba(51,65,85,0.85), rgba(2,6,23,0.95))" };
  return {
    backgroundImage: `url(${JSON.stringify(path).slice(1, -1)})`,
    backgroundSize: fit || "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundColor: "#020617",
  };
}

async function fetchJsonWithTimeout(url, timeout = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

function absolutizePath(path, baseUrl) {
  const p = String(path || "").trim();
  if (!p) return "";
  if (/^(data:|blob:|https?:\/\/)/i.test(p)) return p;
  if (!baseUrl) return p;
  try {
    return new URL(p, baseUrl).toString();
  } catch {
    return p;
  }
}

function normalizeManifest(manifest, baseUrl = "") {
  const folders = [];
  const pushAsset = (raw, folder = "Manifest") => {
    if (!raw) return;
    const path = absolutizePath(raw.path || raw.url || raw.src || raw.image || "", baseUrl);
    if (!path) return;
    folders.push({
      id: raw.id || `${folder}_${raw.name || raw.title || path}`,
      title: raw.title || raw.name || path.split("/").pop() || "Asset",
      path,
      fit: raw.fit || "cover",
      source: raw.source || "Media manifest",
      folder: raw.folder || raw.category || folder,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      target: raw.target || raw.slug || path,
      thumb: absolutizePath(raw.thumb || raw.thumbnail || "", baseUrl),
      kind: raw.kind || raw.type || "image",
    });
  };

  if (Array.isArray(manifest)) {
    manifest.forEach((item) => pushAsset(item, item?.folder || "Manifest"));
  } else if (manifest && Array.isArray(manifest.assets)) {
    manifest.assets.forEach((item) => pushAsset(item, item?.folder || manifest.folder || "Manifest"));
  } else if (manifest && Array.isArray(manifest.folders)) {
    manifest.folders.forEach((folder) => {
      const folderName = folder?.name || folder?.label || folder?.id || "Folder";
      (folder?.assets || []).forEach((item) => pushAsset(item, folderName));
    });
  }

  return folders.filter((item, idx, arr) => item.path && arr.findIndex((x) => x.path === item.path && x.folder === item.folder) === idx);
}

function SourcePill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em] transition ${active ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-100" : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10"}`}
    >
      {children}
    </button>
  );
}

export default function MediaLibrary({ onBack, onOpenEditor, onViewSite, onOpenPost }) {
  const [cfg, setCfg] = useState(() => loadConfig());
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState(() => Object.keys(loadConfig().sections || {})[0] || "hero");
  const [favoriteInput, setFavoriteInput] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [manifestState, setManifestState] = useState(() => {
    const initial = loadConfig();
    return {
      loading: false,
      connected: false,
      error: "",
      data: initial?.mediaLibrary?.manifestCache || null,
      fetchedAt: initial?.mediaLibrary?.manifestFetchedAt || "",
    };
  });

  useEffect(() => {
    const timer = setTimeout(() => setMessage(""), 2600);
    return () => clearTimeout(timer);
  }, [message]);

  const push = (next) => {
    saveConfig(next);
    setCfg(loadConfig());
  };

  const refresh = () => {
    const next = loadConfig();
    setCfg(next);
    setManifestState((s) => ({
      ...s,
      data: next?.mediaLibrary?.manifestCache || s.data,
      fetchedAt: next?.mediaLibrary?.manifestFetchedAt || s.fetchedAt,
      connected: !!(next?.mediaLibrary?.manifestCache),
    }));
    setMessage("Media library refreshed from saved dashboard config.");
  };

  const sections = useMemo(() => Object.values(cfg?.sections || {}), [cfg]);
  const selectedSection = useMemo(
    () => sections.find((s) => s.id === selectedSectionId) || sections[0] || null,
    [sections, selectedSectionId]
  );

  useEffect(() => {
    if (!selectedSection && sections[0]?.id) setSelectedSectionId(sections[0].id);
  }, [sections, selectedSection]);

  const favorites = useMemo(() => cfg?.mediaLibrary?.favorites || [], [cfg]);
  const uploads = useMemo(() => cfg?.mediaLibrary?.uploads || [], [cfg]);
  const posts = useMemo(() => cfg?.latestNews || [], [cfg]);
  const integrations = cfg?.integrations || {};
  const mediaManifestUrl = (integrations.mediaManifestUrl || "/media-manifest.json").trim();
  const mediaBaseUrl = (integrations.mediaBaseUrl || integrations.siteUrl || "").trim();

  const refreshManifest = async () => {
    if (!mediaManifestUrl) {
      setManifestState({ loading: false, connected: false, error: "No media manifest endpoint configured", data: null, fetchedAt: "" });
      setMessage("Add a media manifest URL in the Save tab first.");
      return;
    }
    setManifestState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const data = await fetchJsonWithTimeout(mediaManifestUrl, 7000);
      const next = {
        ...cfg,
        mediaLibrary: {
          ...(cfg.mediaLibrary || {}),
          manifestCache: data,
          manifestFetchedAt: new Date().toISOString(),
        },
      };
      push(next);
      setManifestState({ loading: false, connected: true, error: "", data, fetchedAt: next.mediaLibrary.manifestFetchedAt });
      setMessage("Media manifest synced.");
    } catch (err) {
      setManifestState((s) => ({ ...s, loading: false, connected: false, error: String(err?.message || err) }));
      setMessage("Media manifest fetch failed. Make sure public/media-manifest.json exists, then try Sync manifest now again.");
    }
  };

  useEffect(() => {
    if (mediaManifestUrl && !manifestState.data && !manifestState.loading) {
      refreshManifest();
    }
  }, []);

  const remoteAssets = useMemo(() => normalizeManifest(manifestState.data, mediaBaseUrl), [manifestState.data, mediaBaseUrl]);

  const assetVault = useMemo(() => {
    const vault = [];

    remoteAssets.forEach((asset) => {
      vault.push({
        ...asset,
        id: `manifest_${asset.id}`,
        source: asset.source || "Media manifest",
      });
    });

    sections.forEach((section) => {
      if (section?.backgroundImage) {
        vault.push({
          id: `section_${section.id}`,
          title: section.label || section.id,
          path: section.backgroundImage,
          fit: section.backgroundFit || "cover",
          source: "Section background",
          folder: "Sections",
          target: section.id,
        });
      }
    });

    posts.forEach((post) => {
      if (post?.image) {
        vault.push({
          id: `post_${post.id}`,
          title: post.title || "Untitled post",
          path: post.image,
          fit: post.mediaFit || "contain",
          source: "Latest News image",
          folder: "Posts",
          target: post.id,
        });
      }
    });

    favorites.forEach((path, idx) => {
      if (path) {
        vault.push({
          id: `favorite_${idx}`,
          title: `Favorite ${idx + 1}`,
          path,
          fit: "cover",
          source: "Favorite path",
          folder: "Favorites",
          target: path,
        });
      }
    });

    uploads.forEach((asset) => {
      if (asset?.dataUrl) {
        vault.push({
          id: asset.id,
          title: asset.name || "Uploaded asset",
          path: asset.dataUrl,
          fit: asset.fit || "cover",
          source: "Uploaded asset",
          folder: "Uploads",
          target: asset.id,
        });
      }
    });

    return vault.filter((item, idx, arr) => item.path && arr.findIndex((x) => x.path === item.path && x.source === item.source && x.folder === item.folder) === idx);
  }, [remoteAssets, sections, posts, favorites, uploads]);

  const folders = useMemo(() => {
    const set = new Set();
    assetVault.forEach((item) => set.add(item.folder || "Other"));
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [assetVault]);

  const filteredVault = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assetVault.filter((item) => {
      const sourceMatch = sourceFilter === "all" || item.source === sourceFilter;
      const folderMatch = folderFilter === "all" || (item.folder || "Other") === folderFilter;
      const queryMatch = !q || [item.title, item.path, item.source, item.target, item.folder, ...(item.tags || [])].some((part) => String(part || "").toLowerCase().includes(q));
      return sourceMatch && folderMatch && queryMatch;
    });
  }, [assetVault, query, sourceFilter, folderFilter]);

  const stats = useMemo(() => {
    const sectionWithImages = sections.filter((s) => !!s?.backgroundImage).length;
    const postsWithImages = posts.filter((p) => !!p?.image).length;
    return {
      manifestCount: remoteAssets.length,
      sectionWithImages,
      postsWithImages,
      favoriteCount: favorites.length,
      uploadCount: uploads.length,
      totalAssets: assetVault.length,
    };
  }, [sections, posts, favorites, uploads, assetVault, remoteAssets]);

  const updateSelectedSection = (patch) => {
    if (!selectedSection) return;
    const next = { ...cfg, sections: { ...(cfg.sections || {}) } };
    next.sections[selectedSection.id] = { ...next.sections[selectedSection.id], ...patch };
    push(next);
  };

  const applyAssetToSelectedSection = (asset) => {
    if (!selectedSection || !asset?.path) return;
    updateSelectedSection({ backgroundImage: asset.path, backgroundFit: asset.fit || "cover" });
    setMessage(`Applied asset to ${selectedSection.label || selectedSection.id}.`);
  };

  const saveFavorite = () => {
    const path = favoriteInput.trim();
    if (!path) return;
    const next = { ...cfg, mediaLibrary: { ...(cfg.mediaLibrary || {}), favorites: [...favorites] } };
    if (!next.mediaLibrary.favorites.includes(path)) next.mediaLibrary.favorites.unshift(path);
    push(next);
    setFavoriteInput("");
    setMessage("Favorite path saved.");
  };

  const removeFavorite = (path) => {
    const next = { ...cfg, mediaLibrary: { ...(cfg.mediaLibrary || {}), favorites: favorites.filter((x) => x !== path) } };
    push(next);
    setMessage("Favorite path removed.");
  };

  const removeUpload = (id) => {
    const next = { ...cfg, mediaLibrary: { ...(cfg.mediaLibrary || {}), uploads: uploads.filter((x) => x.id !== id) } };
    push(next);
    setMessage("Uploaded asset removed.");
  };

  const uploadAsset = async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) return;
      const next = {
        ...cfg,
        mediaLibrary: {
          ...(cfg.mediaLibrary || {}),
          uploads: [
            {
              id: uid("upload"),
              name: file.name,
              dataUrl,
              fit: "cover",
              addedAt: new Date().toISOString(),
            },
            ...uploads,
          ],
        },
      };
      push(next);
      setMessage("Asset uploaded into dashboard storage.");
    };
    reader.readAsDataURL(file);
  };

  const copyText = async (text, ok = "Copied.") => {
    try {
      await navigator.clipboard.writeText(text || "");
      setMessage(ok);
    } catch {
      setMessage("Could not copy automatically.");
    }
  };

  const sourceOptions = ["all", "Media manifest", "Section background", "Latest News image", "Favorite path", "Uploaded asset"];

  return (
    <div className="min-h-screen overflow-hidden bg-[#050816] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(168,85,247,0.12),transparent_24%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1720px] flex-col gap-5 px-4 py-4 md:px-6 md:py-6 xl:px-8">
        <header className="rounded-[30px] border border-white/10 bg-black/20 px-5 py-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl md:px-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em] text-slate-300">
                <ImageIcon className="h-3.5 w-3.5" />
                Media Library
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Real asset control for sections, posts, and media manifests.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base">
                This now supports a real media manifest endpoint so your asset vault can pull from an actual image inventory instead of only local dashboard previews and saved paths. Best workflow: auto-generate /media-manifest.json from your real image folders.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={refresh} className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">
                <RefreshCcw className="mr-2 inline h-4 w-4" /> Refresh
              </button>
              <button type="button" onClick={onBack} className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">
                <ArrowLeft className="mr-2 inline h-4 w-4" /> Back
              </button>
              <button type="button" onClick={onOpenEditor} className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">
                <Layers3 className="mr-2 inline h-4 w-4" /> Editor
              </button>
              <button type="button" onClick={onOpenPost} className="rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10">
                <Sparkles className="mr-2 inline h-4 w-4" /> Post Studio
              </button>
              <button type="button" onClick={onViewSite} className="rounded-full bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110">
                <ExternalLink className="mr-2 inline h-4 w-4" /> View Site
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {[
            ["Assets in vault", String(stats.totalAssets), FolderOpen],
            ["Manifest assets", String(stats.manifestCount), Server],
            ["Sections with images", String(stats.sectionWithImages), Monitor],
            ["Posts with images", String(stats.postsWithImages), ImageIcon],
            ["Favorite paths", String(stats.favoriteCount), Star],
            ["Uploaded assets", String(stats.uploadCount), Upload],
          ].map(([label, value, Icon]) => (
            <div key={label} className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-300">{label}</div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <Icon className="h-5 w-5 text-slate-100" />
                </div>
              </div>
              <div className="mt-4 text-3xl font-semibold tracking-tight">{value}</div>
              <div className="mt-1 text-sm text-slate-400">Dashboard media inventory</div>
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <Panel title="Manifest Connection" icon={Link2} right={<div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${manifestState.loading ? "border-amber-300/30 bg-amber-300/10 text-amber-200" : manifestState.connected ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-white/10 bg-white/5 text-white/55"}`}>{manifestState.loading ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : manifestState.connected ? <Server className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}{manifestState.loading ? "Loading" : manifestState.connected ? "Connected" : "Disconnected"}</div>}>
            <div className="space-y-4 p-5">
              <div>
                <Label>Media manifest URL</Label>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 break-all">{mediaManifestUrl || "/media-manifest.json"}</div>
              </div>
              <div>
                <Label>Media base URL</Label>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/80 break-all">{mediaBaseUrl || "Not configured"}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={refreshManifest} className="rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110">Sync manifest now</button>
                <button type="button" onClick={() => copyText(mediaManifestUrl || "/media-manifest.json", "Manifest URL copied.")} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10">Copy manifest URL</button>
                <button type="button" onClick={() => { setCfg((prev) => {
                  const next = deepClone(prev);
                  next.integrations = { ...(next.integrations || {}), mediaManifestUrl: "/media-manifest.json", mediaBaseUrl: "" };
                  return next;
                }); setMessage("Default manifest settings applied."); }} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10">Use default setup</button>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-slate-300">
                Configure these in the Save tab. The media library accepts an <span className="font-semibold text-white">assets</span> array, a <span className="font-semibold text-white">folders</span> array with assets inside, or a raw array of asset objects.
              </div>
              {manifestState.fetchedAt ? <div className="text-xs uppercase tracking-[0.2em] text-white/45">Last synced: {new Date(manifestState.fetchedAt).toLocaleString()}</div> : null}
              {manifestState.error ? <div className="rounded-[22px] border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">Manifest fetch note: {manifestState.error}<div className="mt-2 text-amber-50/90">Best setup: keep a file at <span className="font-semibold text-white">public/media-manifest.json</span>, restart dev if needed, then sync again.</div></div> : null}
            </div>
          </Panel>

          <Panel
            title="Asset Vault"
            icon={FolderOpen}
            right={
              <div className="relative w-full max-w-[260px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} className={`${fieldClass()} pl-9`} placeholder="Search assets, posts, sections..." />
              </div>
            }
          >
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                {sourceOptions.map((source) => (
                  <SourcePill key={source} active={sourceFilter === source} onClick={() => setSourceFilter(source)}>
                    {source === "all" ? "All Sources" : source}
                  </SourcePill>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Label>Folder</Label>
                <select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} className="h-10 min-w-[220px] rounded-2xl border border-white/10 bg-black/30 px-3 text-sm text-white/90 outline-none">
                  {folders.map((folder) => (
                    <option key={folder} value={folder}>{folder === "all" ? "All folders" : folder}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredVault.map((asset) => (
                  <div key={asset.id} className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                    <div className="aspect-[16/10] w-full" style={previewStyle(asset.thumb || asset.path, asset.fit)} />
                    <div className="space-y-3 p-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{asset.source} · {asset.folder || "Other"}</div>
                        <div className="mt-1 text-lg font-semibold text-white">{asset.title}</div>
                      </div>
                      <div className="line-clamp-2 text-sm text-slate-300 break-all">{asset.path}</div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => applyAssetToSelectedSection(asset)} className="rounded-full bg-cyan-300 px-3 py-2 text-xs font-semibold text-black transition hover:brightness-110">Apply to section</button>
                        <button type="button" onClick={() => copyText(asset.path, "Asset path copied.")} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10"><Copy className="mr-1 inline h-3.5 w-3.5" />Copy</button>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredVault.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-300 md:col-span-2 2xl:col-span-3">
                    No assets matched that search yet.
                  </div>
                ) : null}
              </div>
            </div>
          </Panel>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
          <Panel title="Section Media Controller" icon={Monitor} right={<div className="text-sm text-cyan-300">{message || "Ready"}</div>}>
            <div className="space-y-5 p-5">
              <div>
                <Label>Section</Label>
                <select value={selectedSection?.id || ""} onChange={(e) => setSelectedSectionId(e.target.value)} className={fieldClass()}>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.label || section.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                <div className="aspect-[16/9] w-full" style={previewStyle(selectedSection?.backgroundImage, selectedSection?.backgroundFit)} />
                <div className="border-t border-white/10 p-4 text-sm text-slate-300">
                  Current preview for <span className="font-semibold text-white">{selectedSection?.label || selectedSection?.id || "No section"}</span>
                </div>
              </div>

              <div>
                <Label>Background image path</Label>
                <input
                  value={selectedSection?.backgroundImage || ""}
                  onChange={(e) => updateSelectedSection({ backgroundImage: e.target.value })}
                  className={fieldClass()}
                  placeholder="/images/gallery/hero/hero.jpg"
                />
              </div>

              <div>
                <Label>Background fit</Label>
                <select value={selectedSection?.backgroundFit || "cover"} onChange={(e) => updateSelectedSection({ backgroundFit: e.target.value })} className={fieldClass()}>
                  <option value="cover">cover</option>
                  <option value="contain">contain</option>
                  <option value="auto">auto</option>
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => updateSelectedSection({ backgroundFit: "cover" })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10">Quick apply cover</button>
                <button type="button" onClick={() => updateSelectedSection({ backgroundFit: "contain" })} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10">Quick apply contain</button>
                <button type="button" onClick={() => copyText(selectedSection?.backgroundImage || "", "Section image path copied.")} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10">Copy current path</button>
                <button type="button" onClick={() => updateSelectedSection({ backgroundImage: "" })} className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100 transition hover:bg-red-400/15">Clear section image</button>
              </div>
            </div>
          </Panel>

          <Panel title="Post Image Index" icon={ImageIcon}>
            <div className="space-y-3 p-5">
              {posts.map((post) => (
                <div key={post.id} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-white">{post.title || "Untitled post"}</div>
                      <div className="mt-1 break-all text-sm text-slate-300">{post.image || "No image path set"}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {post.image ? <button type="button" onClick={() => copyText(post.image, "Post image path copied.")} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10">Copy</button> : null}
                      <button type="button" onClick={onOpenPost} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10">Edit in studio</button>
                    </div>
                  </div>
                </div>
              ))}
              {posts.length === 0 ? <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-300">No Latest News posts in the dashboard config yet.</div> : null}
            </div>
          </Panel>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Favorite Paths" icon={Star}>
            <div className="space-y-4 p-5">
              <div>
                <Label>Add reusable image path</Label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input value={favoriteInput} onChange={(e) => setFavoriteInput(e.target.value)} className={fieldClass()} placeholder="/images/gallery/eclipse/totality.jpg" />
                  <button type="button" onClick={saveFavorite} className="rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110">
                    <Plus className="mr-2 inline h-4 w-4" /> Save
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {favorites.map((path) => (
                  <div key={path} className="flex flex-col gap-3 rounded-[22px] border border-white/10 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="break-all text-sm text-slate-200">{path}</div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => copyText(path, "Favorite path copied.")} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10">Copy</button>
                      <button type="button" onClick={() => selectedSection && updateSelectedSection({ backgroundImage: path, backgroundFit: "cover" })} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10">Apply</button>
                      <button type="button" onClick={() => removeFavorite(path)} className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-medium text-red-100 transition hover:bg-red-400/15">Remove</button>
                    </div>
                  </div>
                ))}
                {favorites.length === 0 ? <div className="rounded-[22px] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-slate-300">No saved favorite paths yet.</div> : null}
              </div>
            </div>
          </Panel>

          <Panel title="Dashboard Upload Bin" icon={Upload} right={<label className="cursor-pointer rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10"><Upload className="mr-2 inline h-3.5 w-3.5" />Upload<input type="file" accept="image/*" className="hidden" onChange={(e) => uploadAsset(e.target.files?.[0])} /></label>}>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              {uploads.map((asset) => (
                <div key={asset.id} className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
                  <div className="aspect-[4/3] w-full" style={previewStyle(asset.dataUrl, asset.fit || "cover")} />
                  <div className="space-y-3 p-4">
                    <div className="text-lg font-semibold text-white line-clamp-1">{asset.name}</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Dashboard-stored upload</div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => selectedSection && updateSelectedSection({ backgroundImage: asset.dataUrl, backgroundFit: asset.fit || "cover" })} className="rounded-full bg-cyan-300 px-3 py-2 text-xs font-semibold text-black transition hover:brightness-110">Apply to section</button>
                      <button type="button" onClick={() => copyText(asset.dataUrl, "Data URL copied.")} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10">Copy</button>
                      <button type="button" onClick={() => removeUpload(asset.id)} className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs font-medium text-red-100 transition hover:bg-red-400/15"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete</button>
                    </div>
                  </div>
                </div>
              ))}
              {uploads.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-black/20 p-6 text-sm text-slate-300 md:col-span-2">
                  Uploads here are still stored in dashboard local storage for fast mockups and testing. Your real long-term asset source should now be the media manifest feed above.
                </div>
              ) : null}
            </div>
          </Panel>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <Panel title="Workflow Notes" icon={Save}>
            <div className="space-y-4 p-5 text-sm leading-7 text-slate-300">
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                For permanent site images, point the dashboard at an auto-generated media manifest JSON file generated from your real project folders. Then use standard file paths like <span className="font-semibold text-white">/images/gallery/...</span> in those manifest entries.
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                Use <span className="font-semibold text-white">mediaBaseUrl</span> when the manifest contains relative paths but the assets live on your real site domain or another image host.
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                Uploaded assets are still useful for quick private previews, but the manifest-backed library is now the cleaner production workflow.
              </div>
            </div>
          </Panel>

          <Panel title="Manifest Shapes Supported" icon={Server}>
            <div className="space-y-4 p-5 text-sm leading-7 text-slate-300">
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="font-semibold text-white">Option 1</div>
                Raw array of assets.
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="font-semibold text-white">Option 2</div>
                Object with <span className="font-semibold text-white">assets</span> array.
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="font-semibold text-white">Option 3</div>
                Object with <span className="font-semibold text-white">folders</span> array, each containing its own assets list.
              </div>
            </div>
          </Panel>
        </section>
      </div>
    </div>
  );
}
