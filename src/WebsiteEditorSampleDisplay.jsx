import React from "react";

export default function WebsiteEditorSampleDisplay() {
  const [siteTitle, setSiteTitle] = React.useState("Jake Schultz Astrophotography");
  const [heroBadge, setHeroBadge] = React.useState("Astrophotography • Eclipses • Night Sky");
  const [heroTitle, setHeroTitle] = React.useState("Exploring the night sky through astrophotography, eclipse coverage, and immersive sky tools.");
  const [heroText, setHeroText] = React.useState(
    "This sample display gives you a quick visual stand-in for your real homepage so you can see edits more easily while you work inside the dashboard."
  );
  const [ctaPrimary, setCtaPrimary] = React.useState("Explore the Gallery");
  const [ctaSecondary, setCtaSecondary] = React.useState("Open Astrocast");
  const [accent, setAccent] = React.useState("#d2b277");
  const [background, setBackground] = React.useState("#040814");
  const [panel, setPanel] = React.useState("#0c1324");
  const [showCalendarAd, setShowCalendarAd] = React.useState(true);
  const [showLatestNews, setShowLatestNews] = React.useState(true);
  const [showSidebar, setShowSidebar] = React.useState(true);
  const [sidebarCompact, setSidebarCompact] = React.useState(false);

  const latestPosts = [
    {
      title: "Markarian's Chain",
      date: "March 4, 2026",
      desc: "Sample post layout for galaxy imaging updates, AstroBin links, and social-style card spacing.",
    },
    {
      title: "Eclipse Guide",
      date: "March 1, 2026",
      desc: "Preview how feature updates, page promos, and section visuals will feel before deployment.",
    },
    {
      title: "Phone Backgrounds",
      date: "February 13, 2026",
      desc: "A sample promo card for wallpapers, downloads, and new image releases.",
    },
  ];

  const navItems = ["Gallery", "Astrocast", "Eclipse Guide", "Phone Backgrounds", "About", "Shop"];
  const sidebarItems = ["Astrocast", "Eclipse Planner", "Planetarium", "Phone Backgrounds", "Latest News"];

  return (
    <div className="min-h-screen bg-[#020617] text-white" style={{ backgroundColor: background }}>
      <div className="grid min-h-screen grid-cols-1 xl:grid-cols-[380px_1fr]">
        <aside className="border-r border-white/10 bg-black/25 p-5 backdrop-blur-md">
          <div className="mb-5">
            <h1 className="text-2xl font-semibold tracking-tight">Website Editor Preview</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              This version is shaped more like your real homepage so you can better judge changes while editing.
            </p>
          </div>

          <div className="space-y-5">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Brand</h2>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-slate-300">Site title</span>
                  <input value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-slate-300">Hero badge</span>
                  <input value={heroBadge} onChange={(e) => setHeroBadge(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm" />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Hero Section</h2>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-sm text-slate-300">Hero title</span>
                  <textarea value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} rows={3} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-slate-300">Hero text</span>
                  <textarea value={heroText} onChange={(e) => setHeroText(e.target.value)} rows={4} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-sm text-slate-300">Primary button</span>
                    <input value={ctaPrimary} onChange={(e) => setCtaPrimary(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-slate-300">Secondary button</span>
                    <input value={ctaSecondary} onChange={(e) => setCtaSecondary(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950 px-3 py-2 text-sm" />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Theme</h2>
              <div className="grid grid-cols-3 gap-3">
                <label className="text-xs text-slate-300">
                  Accent
                  <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="mt-2 h-11 w-full rounded-xl bg-transparent" />
                </label>
                <label className="text-xs text-slate-300">
                  Surface
                  <input type="color" value={panel} onChange={(e) => setPanel(e.target.value)} className="mt-2 h-11 w-full rounded-xl bg-transparent" />
                </label>
                <label className="text-xs text-slate-300">
                  Background
                  <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="mt-2 h-11 w-full rounded-xl bg-transparent" />
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Visible Sections</h2>
              <div className="space-y-3 text-sm">
                <label className="flex items-center justify-between gap-3">
                  <span>Show calendar ad</span>
                  <input type="checkbox" checked={showCalendarAd} onChange={() => setShowCalendarAd(!showCalendarAd)} />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Show latest news</span>
                  <input type="checkbox" checked={showLatestNews} onChange={() => setShowLatestNews(!showLatestNews)} />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Show sidebar</span>
                  <input type="checkbox" checked={showSidebar} onChange={() => setShowSidebar(!showSidebar)} />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span>Compact sidebar</span>
                  <input type="checkbox" checked={sidebarCompact} onChange={() => setSidebarCompact(!sidebarCompact)} />
                </label>
              </div>
            </section>
          </div>
        </aside>

        <main className="p-4 md:p-6 xl:p-8">
          <div className="mx-auto max-w-[1500px] overflow-hidden rounded-[32px] border border-white/10 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
            <header className="border-b border-white/10 px-5 py-4 md:px-7" style={{ backgroundColor: panel }}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-lg font-semibold">
                    JS
                  </div>
                  <div>
                    <div className="text-lg font-semibold tracking-tight">{siteTitle}</div>
                    <div className="text-sm text-slate-400">Homepage sample display</div>
                  </div>
                </div>
                <nav className="flex flex-wrap gap-2 text-sm text-slate-300">
                  {navItems.map((item) => (
                    <button key={item} className="rounded-full border border-white/10 px-3 py-2 hover:bg-white/5">
                      {item}
                    </button>
                  ))}
                </nav>
              </div>
            </header>

            <div className={`grid min-h-[900px] ${showSidebar ? "grid-cols-1 xl:grid-cols-[1fr_300px]" : "grid-cols-1"}`}>
              <div className="p-5 md:p-8">
                <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 md:p-10">
                  <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 20% 20%, ${accent}55, transparent 35%), radial-gradient(circle at 80% 30%, #3b82f655, transparent 28%), radial-gradient(circle at 55% 80%, #ffffff11, transparent 26%)` }} />
                  <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
                    <div>
                      <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.24em] text-slate-300">
                        {heroBadge}
                      </div>
                      <h2 className="mt-5 max-w-4xl text-3xl font-semibold leading-tight md:text-5xl xl:text-6xl">
                        {heroTitle}
                      </h2>
                      <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                        {heroText}
                      </p>
                      <div className="mt-7 flex flex-wrap gap-3">
                        <button className="rounded-full px-5 py-3 text-sm font-semibold text-black" style={{ backgroundColor: accent }}>
                          {ctaPrimary}
                        </button>
                        <button className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white">
                          {ctaSecondary}
                        </button>
                      </div>
                    </div>

                    <div className="mx-auto w-full max-w-[420px]">
                      <div className="aspect-[4/5] rounded-[32px] border border-white/10 bg-gradient-to-b from-slate-700/50 to-slate-950 shadow-2xl" />
                      <div className="mt-4 text-center text-sm text-slate-400">Hero portrait/image placeholder</div>
                    </div>
                  </div>
                </section>

                {showCalendarAd && (
                  <section className="mt-6 rounded-[28px] border border-white/10 p-5 md:p-6" style={{ backgroundColor: `${panel}dd` }}>
                    <div className="grid items-center gap-5 md:grid-cols-[1.2fr_0.8fr]">
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Featured</div>
                        <h3 className="mt-2 text-2xl font-semibold">2026 Astrophotography Calendar</h3>
                        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
                          Use this block to preview your calendar ad placement, featured product messaging, and call-to-action styling.
                        </p>
                        <button className="mt-5 rounded-full px-5 py-3 text-sm font-semibold text-black" style={{ backgroundColor: accent }}>
                          Shop the Calendar
                        </button>
                      </div>
                      <div className="aspect-[16/10] rounded-[24px] border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950" />
                    </div>
                  </section>
                )}

                {showLatestNews && (
                  <section className="mt-6">
                    <div className="mb-4 flex items-end justify-between gap-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Social-style feed</div>
                        <h3 className="mt-1 text-2xl font-semibold">Latest News</h3>
                      </div>
                      <div className="text-sm text-slate-400">{latestPosts.length} preview cards</div>
                    </div>

                    <div className="space-y-4">
                      {latestPosts.map((post) => (
                        <article key={post.title} className="overflow-hidden rounded-[28px] border border-white/10" style={{ backgroundColor: `${panel}cc` }}>
                          <div className="grid gap-0 md:grid-cols-[320px_1fr]">
                            <div className="min-h-[220px] bg-gradient-to-br from-slate-700 to-slate-950" />
                            <div className="p-5 md:p-6">
                              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">{post.date}</div>
                              <h4 className="mt-2 text-2xl font-semibold">{post.title}</h4>
                              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{post.desc}</p>
                              <div className="mt-5 flex flex-wrap gap-3">
                                <button className="rounded-full px-4 py-2 text-sm font-semibold text-black" style={{ backgroundColor: accent }}>
                                  View Post
                                </button>
                                <button className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white">
                                  Share
                                </button>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {showSidebar && (
                <aside className="border-l border-white/10 p-4 md:p-5" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                  <div className={`rounded-[28px] border border-white/10 ${sidebarCompact ? "p-4" : "p-5 md:p-6"}`} style={{ backgroundColor: `${panel}cc` }}>
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-400">Mobile-style sidebar</div>
                    <h3 className="mt-2 text-lg font-semibold">Quick Access</h3>
                    <div className={`mt-4 ${sidebarCompact ? "space-y-2" : "space-y-3"}`}>
                      {sidebarItems.map((item) => (
                        <button
                          key={item}
                          className={`flex w-full items-center justify-between rounded-2xl border border-white/10 text-left transition hover:bg-white/5 ${sidebarCompact ? "px-3 py-2.5 text-sm" : "px-4 py-3.5 text-sm"}`}
                        >
                          <span>{item}</span>
                          <span className="text-slate-500">→</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
