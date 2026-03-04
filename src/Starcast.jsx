import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Instagram, Facebook, Camera, MapPin, Search } from "lucide-react";
import * as Astronomy from "astronomy-engine";

/**
 * STARCAST
 * A stargazing/astrophotography visibility forecast page.
 *
 * Data sources:
 * - Open-Meteo geocoding + forecast (no API key)
 * - Astronomy Engine for moon + planets + astronomical night
 *
 * Notes:
 * - This is a heuristic "visibility score" (0–100). It's not a perfect analog to Clear Outside/Astrospheric,
 *   but it’s a solid starting point and we can iterate to match those models more closely.
 */

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function formatTime(dt, tz) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    }).format(dt);
  } catch {
    return dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
}

function safeJsonParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function readCache(key, maxAgeMs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const j = safeJsonParse(raw);
    if (!j?.savedAt || !j?.data) return null;
    const age = Date.now() - new Date(j.savedAt).getTime();
    if (Number.isFinite(maxAgeMs) && age > maxAgeMs) return null;
    return j;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), data }));
  } catch {
    // ignore
  }
}



function MoonPhaseCanvas({ fraction, phaseDeg, size = 44 }) {
  const canvasRef = React.useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const w = Math.round(size * dpr);
    const h = Math.round(size * dpr);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const f = typeof fraction === "number" ? clamp(fraction, 0, 1) : 0.5;
    const p = typeof phaseDeg === "number" ? ((phaseDeg % 360) + 360) % 360 : 180;
    const waxing = p < 180;

    // Phase geometry:
    // Use illuminated fraction to derive phase angle theta (0=full, pi=new).
    // f = (1 + cos(theta)) / 2  => cos(theta) = 2f - 1
    const cosTheta = clamp(2 * f - 1, -1, 1);
    const theta = Math.acos(cosTheta);

    // Sun direction in moon-local coords (observer looking toward +z).
    // Put Sun in x-z plane; x sign sets waxing (lit on right) vs waning (lit on left).
    const sx = (waxing ? 1 : -1) * Math.sin(theta);
    const sz = Math.cos(theta);

    const img = ctx.createImageData(w, h);
    const data = img.data;

    const cx = (w - 1) / 2;
    const cy = (h - 1) / 2;
    const r = Math.min(w, h) * 0.46;

    // Deterministic "texture" noise for realism (no external assets).
    function hash(x, y) {
      // simple integer hash
      let n = x * 374761393 + y * 668265263;
      n = (n ^ (n >> 13)) * 1274126177;
      n = n ^ (n >> 16);
      return (n >>> 0) / 4294967295;
    }

    // Render
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const dx = (i - cx) / r;
        const dy = (j - cy) / r;
        const rr = dx * dx + dy * dy;

        const idx = (j * w + i) * 4;

        if (rr > 1) {
          data[idx + 3] = 0;
          continue;
        }

        // Visible hemisphere z
        const z = Math.sqrt(Math.max(0, 1 - rr));

        // Surface normal
        const nx = dx;
        const ny = dy;
        const nz = z;

        // Lambertian lighting with slight limb darkening
        const dot = Math.max(0, nx * sx + nz * sz); // ny doesn't matter (sun in x-z plane)
        const limb = 0.55 + 0.45 * nz; // darker near limb
        const earthshine = 0.08; // faint dark-side glow

        // Subtle crater texture (albedo variation)
        const n1 = hash(i, j);
        const n2 = hash(i + 17, j + 31);
        const tex = 0.92 + 0.12 * (n1 - 0.5) + 0.08 * (n2 - 0.5);

        // Base brightness
        let b = (earthshine + dot) * limb * tex;

        // Tone map / clamp
        b = clamp(b, 0, 1);

        // Slight warm/cool mix: keep mostly neutral
        const base = Math.round(255 * b);
        // tiny chroma shift for realism
        const rC = clamp(base + 6, 0, 255);
        const gC = clamp(base + 2, 0, 255);
        const bC = clamp(base - 4, 0, 255);

        data[idx + 0] = rC;
        data[idx + 1] = gC;
        data[idx + 2] = bC;
        data[idx + 3] = 255;
      }
    }

    // Draw to canvas
    ctx.clearRect(0, 0, w, h);

    // Soft outer glow (subtle)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.04, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.restore();

    // Clip to disk and paint pixels
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.putImageData(img, 0, 0);
    ctx.restore();

    // Crisp limb ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = Math.max(1, Math.round(1 * dpr));
    ctx.stroke();
  }, [fraction, phaseDeg, size]);

  return <canvas ref={canvasRef} className="block" aria-label="Moon phase" />;
}

function SkyDomeCanvas({
  width = 520,
  height = 360,
  points = [], // [{alt, az, kind, label, emphasis}]
  tracks = [], // [{kind,label,pts:[{alt,az,t,isInWindow}], emphasis}]
  pick = null, // {alt, az}
  fovDiagDeg = null, // number (diagonal FOV in degrees) for framing circle
  onPick = null, // (alt, az) => void
}) {
  const ref = React.useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const W = Math.round(width * dpr);
    const H = Math.round(height * dpr);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.clearRect(0, 0, W, H);

    // Dome geometry (azimuth 0=N, 90=E). Zenith at center.
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) * 0.44;

    const proj = (altDeg, azDeg) => {
      const alt = clamp(altDeg ?? -90, -90, 90);
      const az = (((azDeg ?? 0) % 360) + 360) % 360;
      const rho = clamp((90 - alt) / 90, 0, 1) * r;
      const a = (az * Math.PI) / 180;
      const x = cx + rho * Math.sin(a);
      const y = cy - rho * Math.cos(a);
      return { x, y, rho };
    };

    // Backplate
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fill();
    ctx.restore();

    // Altitude rings
    const rings = [30, 60];
    for (const alt of rings) {
      const rho = ((90 - alt) / 90) * r;
      ctx.beginPath();
      ctx.arc(cx, cy, rho, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = `${10 * dpr}px ui-sans-serif`;
      ctx.fillText(`${alt}°`, cx + 6 * dpr, cy - rho + 12 * dpr);
    }

    // Crosshair / cardinal lines
    const cardinals = [
      { az: 0, label: "N" },
      { az: 90, label: "E" },
      { az: 180, label: "S" },
      { az: 270, label: "W" },
    ];
    for (const c of cardinals) {
      const p = proj(0, c.az);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.font = `${12 * dpr}px ui-sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const lp = proj(-2, c.az);
      ctx.fillText(c.label, lp.x, lp.y);
    }

    // Tracks first
    const kindStyle = (kind) => {
      if (kind === "target") return { stroke: "rgba(180,255,210,0.75)", fill: "rgba(180,255,210,0.95)" };
      if (kind === "moon") return { stroke: "rgba(255,255,255,0.55)", fill: "rgba(255,255,255,0.85)" };
      return { stroke: "rgba(255,255,255,0.35)", fill: "rgba(255,255,255,0.6)" };
    };

    for (const tr of tracks || []) {
      const st = kindStyle(tr.kind);
      const pts = (tr.pts || []).filter((p) => (p.alt ?? -90) > 0);
      if (pts.length < 2) continue;

      // base path
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = proj(pts[i].alt, pts[i].az);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = st.stroke;
      ctx.lineWidth = (tr.emphasis ? 2.4 : 1.6) * dpr;
      ctx.stroke();

      // highlight in-window segment
      const winPts = pts.filter((p) => p.isInWindow);
      if (winPts.length >= 2) {
        ctx.beginPath();
        for (let i = 0; i < winPts.length; i++) {
          const p = proj(winPts[i].alt, winPts[i].az);
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = "rgba(255,255,255,0.65)";
        ctx.lineWidth = 3.0 * dpr;
        ctx.stroke();
      }
    }

    // Points
    for (const pt of points || []) {
      if ((pt.alt ?? -90) <= 0) continue;
      const st = kindStyle(pt.kind);
      const p = proj(pt.alt, pt.az);

      ctx.beginPath();
      ctx.arc(p.x, p.y, (pt.emphasis ? 5.5 : 4.0) * dpr, 0, Math.PI * 2);
      ctx.fillStyle = st.fill;
      ctx.fill();

      if (pt.label) {
        ctx.font = `${11 * dpr}px ui-sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(pt.label, p.x + 7 * dpr, p.y);
      }
    }

    
    // Pick marker + framing circle
    if (pick && typeof pick.alt === "number" && typeof pick.az === "number") {
      const pp = proj(pick.alt, pick.az);

      // framing circle using diagonal FOV (approx)
      if (typeof fovDiagDeg === "number" && fovDiagDeg > 0) {
        const half = fovDiagDeg / 2;
        const pp2 = proj(clamp(pick.alt + half, -90, 90), pick.az);
        const pr = Math.max(4 * dpr, Math.abs(pp2.rho - pp.rho));
        ctx.beginPath();
        ctx.arc(pp.x, pp.y, pr, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(pp.x, pp.y, 5.5 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,220,180,0.95)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, 9.5 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,220,180,0.45)";
      ctx.lineWidth = 1 * dpr;
      ctx.stroke();
    }
// Dome border
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1.2 * dpr;
    ctx.stroke();
  }, [width, height, points, tracks, pick, fovDiagDeg]);

  const handleClick = (e) => {
    if (!onPick) return;
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const W = Math.round(width * dpr);
    const H = Math.round(height * dpr);
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(W, H) * 0.44;

    const x = (px / rect.width) * W;
    const y = (py / rect.height) * H;

    const dx = x - cx;
    const dy = y - cy;
    const rho = Math.sqrt(dx * dx + dy * dy);
    if (rho > r) return;

    const alt = 90 - (rho / r) * 90;
    let az = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0=N,90=E
    az = (az + 360) % 360;

    onPick(alt, az);
  };

  return (
    <canvas
      ref={ref}
      onClick={handleClick}
      className={`block w-full ${onPick ? "cursor-crosshair" : ""}`}
      aria-label="Sky view"
      title={onPick ? "Click to set pointing direction" : undefined}
    />
  );
}

function MiniAltChart({ series = [], tz = "UTC", label = "Alt" }) {
  // series: [{t: Date, alt: number}]
  const ref = React.useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const W = Math.round(520 * dpr);
    const H = Math.round(120 * dpr);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = "100%";
    canvas.style.height = "120px";

    ctx.clearRect(0, 0, W, H);

    const pts = (series || []).filter((p) => p && p.t && Number.isFinite(p.alt));
    if (pts.length < 2) return;

    const pad = 10 * dpr;
    const x0 = pad, x1 = W - pad;
    const y0 = pad, y1 = H - pad;

    const minAlt = 0;
    const maxAlt = 90;

    const tMin = pts[0].t.getTime();
    const tMax = pts[pts.length - 1].t.getTime();

    const xFor = (t) => x0 + ((t - tMin) / Math.max(1, (tMax - tMin))) * (x1 - x0);
    const yFor = (alt) => y1 - (clamp(alt, minAlt, maxAlt) - minAlt) / (maxAlt - minAlt) * (y1 - y0);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1 * dpr;
    for (const a of [0, 30, 60, 90]) {
      const y = yFor(a);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }

    // line
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const x = xFor(pts[i].t.getTime());
      const y = yFor(pts[i].alt);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(180,255,210,0.85)";
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    // labels
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `${11 * dpr}px ui-sans-serif`;
    ctx.fillText(`${label} (0–90°)`, x0, y0 + 12 * dpr);

    // time ticks (start/mid/end)
    const fmt = (dt) => formatTime(dt, tz);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = `${10 * dpr}px ui-sans-serif`;
    const mid = pts[Math.floor(pts.length / 2)].t;
    ctx.fillText(fmt(pts[0].t), x0, y1);
    ctx.textAlign = "center";
    ctx.fillText(fmt(mid), (x0 + x1) / 2, y1);
    ctx.textAlign = "right";
    ctx.fillText(fmt(pts[pts.length - 1].t), x1, y1);
    ctx.textAlign = "left";
  }, [series, tz, label]);

  return <canvas ref={ref} className="block w-full" aria-label="Altitude chart" />;
}

function formatShort(dt, tz) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: tz,
    }).format(dt);
  } catch {
    return dt.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
  }
}

function cardinalFromAz(azDeg) {
  const dirs = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  const i = Math.round((((azDeg % 360) + 360) % 360) / 22.5) % 16;
  return dirs[i];
}

function moonPhaseLabel(when, illumFraction) {
  // Astronomy Engine:
  // - Illumination(...).phase_fraction is 0..1 illuminated fraction
  // - MoonPhase(date) returns an angle in degrees where:
  //     0 = New Moon, 90 = First Quarter, 180 = Full Moon, 270 = Last Quarter
  const phaseDegRaw = Astronomy.MoonPhase(when);
  const phaseDeg = ((phaseDegRaw % 360) + 360) % 360;
  const illum = clamp((illumFraction ?? 0) * 100, 0, 100);

  // Use illumination for crescent/gibbous classification, and phase angle for quarter/full direction.
  const near = (deg, target, tol = 8) => Math.abs(deg - target) <= tol;

  if (illum < 1) return "New Moon";
  if (illum > 99) return "Full Moon";

  // Quarters
  if (near(phaseDeg, 90)) return "First Quarter";
  if (near(phaseDeg, 270)) return "Last Quarter";

  const waxing = phaseDeg < 180;

  if (illum < 50) return waxing ? "Waxing Crescent" : "Waning Crescent";
  return waxing ? "Waxing Gibbous" : "Waning Gibbous";
}

function scoreHour({
  cloud,
  cloudLow,
  cloudMid,
  cloudHigh,
  highCloud, // backward-compat alias
  visibilityKm,
  transparencyScore,
  windMps,
  humidity,
  dewpointC,
  tempC,
  moonAltDeg,
  moonIllum,
}) {
  // Heuristic imaging score (0–100).
  // Design goals:
  // - Separate cloud layers (low/mid/high) because thin high cloud can tank contrast.
  // - Penalize moonlight non-linearly (bright + high altitude hurts more than dim + low).
  const low = typeof cloudLow === "number" ? cloudLow : undefined;
  const mid = typeof cloudMid === "number" ? cloudMid : undefined;
  const high = typeof cloudHigh === "number" ? cloudHigh : (typeof highCloud === "number" ? highCloud : undefined);

  const total = clamp(cloud ?? 0, 0, 100);

  // Weighted layer cloud (stronger weight on high cloud for contrast loss).
  const layered = clamp(
    (typeof low === "number" ? clamp(low, 0, 100) * 0.55 : 0) +
      (typeof mid === "number" ? clamp(mid, 0, 100) * 0.70 : 0) +
      (typeof high === "number" ? clamp(high, 0, 100) * 0.95 : 0),
    0,
    100 * (0.55 + 0.70 + 0.95)
  );

  // If we have layer data, use it; otherwise fall back to total cloud.
  const cloudCore = (typeof low === "number" || typeof mid === "number" || typeof high === "number")
    ? clamp(layered / (0.55 + 0.70 + 0.95), 0, 100)
    : total;

  const cloudPenalty = cloudCore * 0.62;

  const trans01 = Number.isFinite(transparencyScore) ? clamp((transparencyScore ?? 0) / 100, 0, 1) : clamp((visibilityKm ?? 0) / 20, 0, 1);
  const visPenalty = clamp(1 - trans01, 0, 1) * 24;
  const windPenalty = clamp((windMps ?? 0) / 10, 0, 1) * 14;
  const humidPenalty = clamp(((humidity ?? 0) - 55) / 45, 0, 1) * 10;

  let dewPenalty = 0;
  if (typeof dewpointC === "number" && typeof tempC === "number") {
    const spread = tempC - dewpointC; // °C
    dewPenalty = clamp((4 - spread) / 4, 0, 1) * 16; // higher penalty if spread < 4°C
  }

  // Moon penalty: non-linear in illumination and altitude.
  let moonPenalty = 0;
  if ((moonAltDeg ?? -1) > 0) {
    const alt = clamp((moonAltDeg - 3) / 60, 0, 1);
    const illum = clamp(moonIllum ?? 0, 0, 1);
    // Bright moons hurt more than proportionally; also strongly dependent on altitude.
    const bright = Math.pow(illum, 1.25);
    const highUp = Math.pow(alt, 1.35);
    moonPenalty = bright * highUp * 32;
  }

  const base = 100 - cloudPenalty - visPenalty - windPenalty - humidPenalty - dewPenalty - moonPenalty;
  return Math.round(clamp(base, 0, 100));
}

function scoreLabel(s) {
  if (s >= 85) return { label: "EXCELLENT", cls: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30" };
  if (s >= 70) return { label: "GOOD", cls: "bg-lime-500/20 text-lime-200 border-lime-400/30" };
  if (s >= 55) return { label: "FAIR", cls: "bg-yellow-500/20 text-yellow-200 border-yellow-400/30" };
  return { label: "POOR", cls: "bg-red-500/20 text-red-200 border-red-400/30" };
}


function transparencyLabel(score) {
  if (!Number.isFinite(score)) return { label: "—", cls: "bg-white/5 text-white/70 border-white/10" };
  if (score >= 85) return { label: "EXCELLENT", cls: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30" };
  if (score >= 70) return { label: "GOOD", cls: "bg-lime-500/20 text-lime-200 border-lime-400/30" };
  if (score >= 55) return { label: "FAIR", cls: "bg-yellow-500/20 text-yellow-200 border-yellow-400/30" };
  return { label: "POOR", cls: "bg-red-500/20 text-red-200 border-red-400/30" };
}

// Transparency / haze proxy (0–100).
// Uses visibility (km) + PM2.5 (µg/m³) + aerosol optical depth (unitless) when available.
function computeTransparencyScore({ visibilityKm, pm25, aod }) {
  const parts = [];

  if (Number.isFinite(visibilityKm)) {
    // 5 km = very hazy, 25+ km = very clear.
    const vis = clamp((visibilityKm - 5) / 20, 0, 1);
    parts.push({ v: vis, w: 0.50 });
  }

  if (Number.isFinite(pm25)) {
    // Rough mapping: <=5 excellent, 12 good, 35 poor-ish.
    const pm = clamp((35 - pm25) / 35, 0, 1);
    parts.push({ v: pm, w: 0.30 });
  }

  if (Number.isFinite(aod)) {
    // AOD ~0.05–0.15 is good; 0.3+ is hazy.
    const ao = clamp((0.30 - aod) / 0.30, 0, 1);
    parts.push({ v: ao, w: 0.20 });
  }

  if (!parts.length) return null;

  const wsum = parts.reduce((a, p) => a + p.w, 0);
  const vsum = parts.reduce((a, p) => a + p.v * p.w, 0);
  return Math.round(clamp(vsum / wsum, 0, 1) * 100);
}


// Seeing proxy (0–100). This is not true astronomical seeing in arcseconds.
// It is a pragmatic proxy using near-surface wind + temperature change.
// Lower wind and more stable temperatures generally correlate with steadier air.
function computeSeeingScore({ windMps, tempDeltaC }) {
  const w = Number.isFinite(windMps) ? windMps : 0;
  const dT = Number.isFinite(tempDeltaC) ? tempDeltaC : 0;
  // Wind dominates; rapid temp swings penalize.
  const windPenalty = clamp(w / 10, 0, 1) * 70;      // 0..70
  const tempPenalty = clamp(dT / 4, 0, 1) * 30;      // 0..30
  return Math.round(clamp(100 - windPenalty - tempPenalty, 0, 100));
}

function seeingLabel(score) {
  if (!Number.isFinite(score)) return { label: "—", cls: "bg-white/5 text-white/70 border-white/10" };
  if (score >= 80) return { label: "STEADY", cls: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30" };
  if (score >= 60) return { label: "GOOD", cls: "bg-green-500/20 text-green-200 border-green-400/30" };
  if (score >= 40) return { label: "FAIR", cls: "bg-yellow-500/20 text-yellow-200 border-yellow-400/30" };
  return { label: "POOR", cls: "bg-red-500/20 text-red-200 border-red-400/30" };
}

export default function Starcast({ embedded = false, navigate } = {}) {
  const goHome = (e) => {
    if (e) e.preventDefault();
    if (typeof navigate === "function") {
      navigate("/");
    } else {
      window.location.href = "/";
    }
  };

  const [query, setQuery] = useState("");
  const [loc, setLoc] = useState(null); // {name, lat, lon, tz}
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [forecastMeta, setForecastMeta] = useState(null); // {source:"live"|"cache", savedAt:Date}
  const [airqMeta, setAirqMeta] = useState(null); // {source:"live"|"cache", savedAt}
  const [airq, setAirq] = useState(null);
  const forecastAbortRef = useRef(null);
  const [hourly, setHourly] = useState([]);
  const [nightWindow, setNightWindow] = useState(null);
  const [bestHour, setBestHour] = useState(null);
  const [windowHours, setWindowHours] = useState(3);
  const [bestWindow, setBestWindow] = useState(null);
  const [moonInfo, setMoonInfo] = useState(null);
  const [moonExtra, setMoonExtra] = useState(null);
  const [aurora, setAurora] = useState(null);
  const [planetRows, setPlanetRows] = useState([]);
  const [targetRows, setTargetRows] = useState([]);
const [selectedTargetName, setSelectedTargetName] = useState("");
  const [pointing, setPointing] = useState(null); // {alt, az}
  const [autoWindowForPointing, setAutoWindowForPointing] = useState(true);
  const [pointingWindow, setPointingWindow] = useState(null);
  const [sensorPreset, setSensorPreset] = useState("aps-c");
  const [focalMm, setFocalMm] = useState(400);

  // Private beta gate (public sees Coming Soon).
  // Secret unlock: click the Starcast title 7 times within a few seconds.
  // Optional owner shortcuts:
  //  - Triple-click the logo
  //  - Press Shift + A
  const [betaUnlocked, setBetaUnlocked] = useState(false);
  const [betaTapCount, setBetaTapCount] = useState(0);
  const [betaLogoTapCount, setBetaLogoTapCount] = useState(0);

  useEffect(() => {
    if (betaTapCount === 0) return;
    const t = setTimeout(() => setBetaTapCount(0), 4000);
    return () => clearTimeout(t);
  }, [betaTapCount]);

  useEffect(() => {
    if (betaLogoTapCount === 0) return;
    const t = setTimeout(() => setBetaLogoTapCount(0), 2500);
    return () => clearTimeout(t);
  }, [betaLogoTapCount]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.shiftKey && (e.key === "A" || e.key === "a")) setBetaUnlocked(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSecretTitleTap = () => {
    setBetaTapCount((c) => {
      const next = c + 1;
      if (next >= 7) {
        setBetaUnlocked(true);
        return 0;
      }
      return next;
    });
  };

  const handleSecretLogoTap = () => {
    setBetaLogoTapCount((c) => {
      const next = c + 1;
      if (next >= 3) {
        setBetaUnlocked(true);
        return 0;
      }
      return next;
    });
  };

  // Saved pointings (Step 7): store multiple pointings and compare them side-by-side.
  // (Step 7): store multiple pointings and compare them side-by-side.
  const [savedPointings, setSavedPointings] = useState([]); // [{id,name,alt,az,createdAt}]
  const [comparePointings, setComparePointings] = useState(true);
  const [activeSavedPointingId, setActiveSavedPointingId] = useState(null);

  // Load/save saved pointings in localStorage so they persist across refreshes.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("astrocast_saved_pointings_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedPointings(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("astrocast_saved_pointings_v1", JSON.stringify(savedPointings || []));
    } catch {
      // ignore
    }
  }, [savedPointings]);

  // Sessions (Step 8): save a pointing WITH gear + thresholds + notes, and one-click restore.
  const [sessions, setSessions] = useState([]); // [{id,name,notes,alt,az,sensorPreset,focalMm,minAltDeg,windowHours,createdAt}]
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionDraftName, setSessionDraftName] = useState("");
  const [sessionDraftNotes, setSessionDraftNotes] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("astrocast_sessions_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSessions(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("astrocast_sessions_v1", JSON.stringify(sessions || []));
    } catch {
      // ignore
    }
  }, [sessions]);

  const saveSession = () => {
    if (!pointing || !Number.isFinite(pointing.alt) || !Number.isFinite(pointing.az)) return;
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const n = (sessions?.length || 0) + 1;
    const name = (sessionDraftName || `Session ${n}`).trim();
    const notes = (sessionDraftNotes || "").trim();
    const sess = {
      id,
      name,
      notes,
      alt: pointing.alt,
      az: pointing.az,
      sensorPreset,
      focalMm: Number(focalMm) || focalMm,
      minAltDeg,
      windowHours,
      createdAt: new Date().toISOString(),
    };
    setSessions([...(sessions || []), sess]);
    setActiveSessionId(id);
    setSessionDraftName("");
    setSessionDraftNotes("");
  };

  const removeSession = (id) => {
    setSessions((prev) => (prev || []).filter((x) => x.id !== id));
    setActiveSessionId((prev) => (prev === id ? null : prev));
  };

  const renameSession = (id, name) => {
    setSessions((prev) => (prev || []).map((x) => (x.id === id ? { ...x, name } : x)));
  };

  const updateSessionNotes = (id, notes) => {
    setSessions((prev) => (prev || []).map((x) => (x.id === id ? { ...x, notes } : x)));
  };

  const useSession = (sess) => {
    if (!sess) return;
    setPointing({ alt: sess.alt, az: sess.az });
    setSensorPreset(sess.sensorPreset || "aps-c");
    setFocalMm(sess.focalMm ?? 400);
    setMinAltDeg(sess.minAltDeg ?? 30);
    setWindowHours(sess.windowHours ?? 3);
    setAutoWindowForPointing(true);
    setActiveSessionId(sess.id);
    setActiveSavedPointingId(null);
  };


  const saveCurrentPointing = () => {
    if (!pointing || !Number.isFinite(pointing.alt) || !Number.isFinite(pointing.az)) return;
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const n = (savedPointings?.length || 0) + 1;
    const name = `Pointing ${n}`;
    setSavedPointings([...(savedPointings || []), { id, name, alt: pointing.alt, az: pointing.az, createdAt: new Date().toISOString() }]);
    setActiveSavedPointingId(id);
  };

  const removeSavedPointing = (id) => {
    setSavedPointings((prev) => (prev || []).filter((p) => p.id !== id));
    setActiveSavedPointingId((prev) => (prev === id ? null : prev));
  };

  const renameSavedPointing = (id, name) => {
    setSavedPointings((prev) => (prev || []).map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const useSavedPointing = (p) => {
    if (!p) return;
    setPointing({ alt: p.alt, az: p.az });
    setActiveSavedPointingId(p.id);
    setAutoWindowForPointing(true);
  };


  const [minAltDeg, setMinAltDeg] = useState(30);
  const [customTargets, setCustomTargets] = useState([]);
  const [newTarget, setNewTarget] = useState({ name: "", raDeg: "", decDeg: "", type: "Custom" });

  const SENSOR_PRESETS = {
    "aps-c": { key: "aps-c", label: "APS-C (23.6×15.7mm)", w: 23.6, h: 15.7 },
    "ff": { key: "ff", label: "Full Frame (36×24mm)", w: 36.0, h: 24.0 },
    "m43": { key: "m43", label: "Micro 4/3 (17.3×13.0mm)", w: 17.3, h: 13.0 },
  };

  const fov = useMemo(() => {
    const s = SENSOR_PRESETS[sensorPreset] || SENSOR_PRESETS["aps-c"];
    const f = Number(focalMm);
    if (!Number.isFinite(f) || f <= 0) return null;
    const fovH = (2 * Math.atan(s.w / (2 * f)) * 180) / Math.PI;
    const fovV = (2 * Math.atan(s.h / (2 * f)) * 180) / Math.PI;
    const diag = Math.sqrt(s.w * s.w + s.h * s.h);
    const fovD = (2 * Math.atan(diag / (2 * f)) * 180) / Math.PI;
    return { fovH, fovV, fovD };
  }, [sensorPreset, focalMm]);
useEffect(() => {
    // Auto-load something so the page never looks blank.
    if (loc || loading) return;

    const tzGuess = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    const fallback = () => {
      const nextLoc = { name: "Chicago, IL", lat: 41.8781, lon: -87.6298, tz: tzGuess };
      setLoc(nextLoc);
      loadForLocation(nextLoc);
    };

    if (!navigator?.geolocation) {
      fallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const nextLoc = {
          name: "My Location",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          tz: tzGuess,
        };
        setLoc(nextLoc);
        loadForLocation(nextLoc);
      },
      () => fallback(),
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
// Aurora: pull current Kp index from NOAA SWPC (no key) with SWR cache.
useEffect(() => {
  const CACHE_KEY = "astrocast_kp_v1";
  const MAX_AGE = 15 * 60 * 1000; // 15 minutes

  const cached = readCache(CACHE_KEY, MAX_AGE);
  if (cached?.data) {
    setAurora({ ...cached.data, source: "cache" });
  }

  let cancelled = false;
  const ctrl = new AbortController();

  (async () => {
    try {
      const res = await fetch("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json", { signal: ctrl.signal });
      if (!res.ok) throw new Error("Aurora data unavailable");
      const arr = await res.json();
      const cleaned = Array.isArray(arr) ? arr.filter((x) => x && x.kp_index != null) : [];
      const last = cleaned[cleaned.length - 1];
      const kpNow = last ? Number(last.kp_index) : null;
      const tail = cleaned.slice(-180);
      const kpMax3h = tail.length ? Math.max(...tail.map((x) => Number(x.kp_index))) : kpNow;

      const data = {
        kpNow: Number.isFinite(kpNow) ? kpNow : null,
        kpMax3h: Number.isFinite(kpMax3h) ? kpMax3h : null,
        updatedAt: last?.time_tag || new Date().toISOString(),
      };

      if (cancelled) return;
      setAurora({ ...data, source: "live" });
      writeCache(CACHE_KEY, data);
    } catch (e) {
      if (e?.name === "AbortError") return;
      if (!cached?.data && !cancelled) {
        setAurora({ kpNow: null, kpMax3h: null, updatedAt: null, source: "error" });
      }
    }
  })();

  return () => {
    cancelled = true;
    try { ctrl.abort(); } catch {}
  };
}, []);



  useEffect(() => {
    if (!autoWindowForPointing) {
      setPointingWindow(null);
      return;
    }
    if (!pointing || !hourly?.length) {
      setPointingWindow(null);
      return;
    }
    const pw = computeBestWindowForPointing({
      hourlyRows: hourly,
      pointing,
      windowHours,
      minAltDeg,
    });
    setPointingWindow(pw);
  }, [autoWindowForPointing, pointing, hourly, windowHours, minAltDeg]);

  const DEFAULT_TARGETS = useMemo(
    () => [
      { name: "Orion Nebula (M42)", raDeg: 83.8221, decDeg: -5.3911, type: "Nebula" },
      { name: "Horsehead & Flame (IC 434)", raDeg: 85.25, decDeg: -2.45, type: "Nebula" },
      { name: "Rosette Nebula (NGC 2237)", raDeg: 97.5, decDeg: 5.0, type: "Nebula" },
      { name: "California Nebula (NGC 1499)", raDeg: 63.6, decDeg: 36.4, type: "Nebula" },
      { name: "Heart Nebula (IC 1805)", raDeg: 38.0, decDeg: 61.5, type: "Nebula" },
      { name: "Soul Nebula (IC 1848)", raDeg: 35.6, decDeg: 60.4, type: "Nebula" },
      { name: "North America Nebula (NGC 7000)", raDeg: 314.7, decDeg: 44.5, type: "Nebula" },
      { name: "Veil Nebula (NGC 6960)", raDeg: 312.75, decDeg: 30.7, type: "Nebula" },
      { name: "Lagoon Nebula (M8)", raDeg: 270.925, decDeg: -24.375, type: "Nebula" },
      { name: "Trifid Nebula (M20)", raDeg: 270.65, decDeg: -22.97, type: "Nebula" },

      { name: "Andromeda Galaxy (M31)", raDeg: 10.6847, decDeg: 41.2690, type: "Galaxy" },
      { name: "Triangulum Galaxy (M33)", raDeg: 23.4621, decDeg: 30.6602, type: "Galaxy" },
      { name: "Whirlpool Galaxy (M51)", raDeg: 202.47, decDeg: 47.195, type: "Galaxy" },
      { name: "Bode's Galaxy (M81)", raDeg: 148.8882, decDeg: 69.0653, type: "Galaxy" },
      { name: "Cigar Galaxy (M82)", raDeg: 148.9683, decDeg: 69.6797, type: "Galaxy" },

      { name: "Pleiades (M45)", raDeg: 56.75, decDeg: 24.1167, type: "Cluster" },
      { name: "Hercules Cluster (M13)", raDeg: 250.421, decDeg: 36.461, type: "Cluster" },

      { name: "Ring Nebula (M57)", raDeg: 283.396, decDeg: 33.028, type: "Planetary Nebula" },
      { name: "Dumbbell Nebula (M27)", raDeg: 299.901, decDeg: 22.721, type: "Planetary Nebula" }
    ],
    []
  );

  const ALL_TARGETS = useMemo(() => {
    const cleaned = (customTargets || [])
      .filter((t) => t && typeof t.raDeg === "number" && typeof t.decDeg === "number" && t.name)
      .map((t) => ({ ...t, type: t.type || "Custom" }));
    return [...DEFAULT_TARGETS, ...cleaned];
  }, [DEFAULT_TARGETS, customTargets]);

  // Recompute best targets whenever the forecast, window length, altitude threshold, or custom targets change.
  useEffect(() => {
    if (!loc || !hourly?.length) return;
    const best = computeBestTargets({
      lat: loc.lat,
      lon: loc.lon,
      hourlyRows: hourly,
      targets: ALL_TARGETS,
      windowHours,
      minAltDeg,
    });
    setTargetRows(best);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc, hourly, windowHours, minAltDeg, ALL_TARGETS]);


// Keep a valid selected target (default to the top-ranked one).
useEffect(() => {
  if (!targetRows?.length) return;
  if (selectedTargetName && targetRows.some((t) => t.name === selectedTargetName)) return;
  setSelectedTargetName(targetRows[0].name);
}, [targetRows, selectedTargetName]);

const selectedTargetRow = useMemo(
  () => (selectedTargetName ? targetRows?.find((t) => t.name === selectedTargetName) : null),
  [selectedTargetName, targetRows]
);

const selectedTargetDef = useMemo(() => {
  if (!selectedTargetName) return null;
  return ALL_TARGETS.find((t) => t.name === selectedTargetName) || null;
}, [selectedTargetName, ALL_TARGETS]);


  const activeWindow = useMemo(() => {
    if (autoWindowForPointing && pointing && pointingWindow) return pointingWindow;
    return bestWindow;
  }, [autoWindowForPointing, pointing, pointingWindow, bestWindow]);

const selectedTrack = useMemo(() => {
  if (!loc || !hourly?.length || !selectedTargetDef) return null;
  const obs = new Astronomy.Observer(loc.lat, loc.lon, 0);
  const raH = selectedTargetDef.raDeg / 15;
  const decD = selectedTargetDef.decDeg;

  const win = activeWindow
    ? { start: hourly[activeWindow.startIndex]?.t, end: hourly[activeWindow.endIndex]?.t }
    : null;

  const pts = hourly.map((r) => {
    const hor = Astronomy.Horizon(r.t, obs, raH, decD, "normal");
    return {
      t: r.t,
      alt: hor.altitude,
      az: hor.azimuth,
      isInWindow: win ? r.t >= win.start && r.t <= win.end : false,
      isDark: r.isDark,
    };
  });

  // Moon at the same timestamps (for context).
  const moonPts = hourly.map((r) => ({
    t: r.t,
    alt: r.moonAlt,
    az: Number.isFinite(r.moonAz) ? r.moonAz : (() => {
      try {
        const { moon } = computeMoonAndPlanets(loc.lat, loc.lon, r.t);
        return moon.az;
      } catch {
        return 0;
      }
    })(),
    isInWindow: win ? r.t >= win.start && r.t <= win.end : false,
  }));

  // Use the mid-point of the best window (or best hour) for the marker points.
  const markerTime = win?.start && win?.end ? new Date((win.start.getTime() + win.end.getTime()) / 2) : (bestHour?.t || hourly[0].t);
  const targetMarker = (() => {
    const h = Astronomy.Horizon(markerTime, obs, raH, decD, "normal");
    return { alt: h.altitude, az: h.azimuth };
  })();
  const moonMarker = (() => {
    const { moon } = computeMoonAndPlanets(loc.lat, loc.lon, markerTime);
    return { alt: moon.alt, az: moon.az, label: moon.azCard };
  })();

  return { pts, moonPts, markerTime, targetMarker, moonMarker };
}, [loc, hourly, selectedTargetDef, activeWindow, bestHour]);

  const pointingRefTime = useMemo(() => {
    if (activeWindow && hourly?.[activeWindow.startIndex] && hourly?.[activeWindow.endIndex]) {
      const t0 = hourly[activeWindow.startIndex].t.getTime();
      const t1 = hourly[activeWindow.endIndex].t.getTime();
      return new Date(Math.round((t0 + t1) / 2));
    }
    if (bestHour?.t) return bestHour.t;
    return hourly?.[0]?.t || new Date();
  }, [activeWindow, bestHour, hourly]);

  const pointingSuggestions = useMemo(() => {
    if (!pointing || !loc || !pointingRefTime) return [];
    const obs = new Astronomy.Observer(loc.lat, loc.lon, 0);

    const rows = [];
    for (const t of ALL_TARGETS || []) {
      const raH = (t.raDeg ?? 0) / 15;
      const decD = t.decDeg ?? 0;
      const hor = Astronomy.Horizon(pointingRefTime, obs, raH, decD, "normal");
      const alt = hor.altitude;
      const az = hor.azimuth;
      const dist = angularDistanceHorizonDeg(pointing.alt, pointing.az, alt, az);
      rows.push({
        name: t.name,
        type: t.type || "Target",
        alt,
        az,
        distDeg: dist,
      });
    }

    rows.sort((a, b) => a.distDeg - b.distDeg);
    return rows.slice(0, 10);
  }, [pointing, loc, pointingRefTime, ALL_TARGETS]);


  const savedPointingComparisons = useMemo(() => {
    if (!savedPointings?.length || !hourly?.length) return [];
    return (savedPointings || []).map((p) => {
      const w = computeBestWindowForPointing({
        hourlyRows: hourly,
        pointing: { alt: p.alt, az: p.az },
        windowHours,
        minAltDeg,
      });

      // Moon separation at window midpoint (or reference time)
      let moonSep = null;
      try {
        const tMid =
          w && hourly?.[w.startIndex] && hourly?.[w.endIndex]
            ? new Date((hourly[w.startIndex].t.getTime() + hourly[w.endIndex].t.getTime()) / 2)
            : pointingRefTime;
        const { moon } = computeMoonAndPlanets(loc?.lat ?? 0, loc?.lon ?? 0, tMid);
        moonSep = angularDistanceHorizonDeg(p.alt, p.az, moon.alt, moon.az);
      } catch {
        moonSep = null;
      }

      return {
        ...p,
        bestWindow: w,
        bestScore: (typeof w?.avgPointingScore === "number" ? w.avgPointingScore : null),
        moonSepDeg: moonSep,
      };
    });
  }, [savedPointings, hourly, windowHours, minAltDeg, loc, pointingRefTime]);





  
  function forecastCacheKey(lat, lon, tz) {
    const a = Number(lat).toFixed(3);
    const b = Number(lon).toFixed(3);
    const z = String(tz || "UTC");
    return `astrocast_forecast_v1:${a},${b},${z}`;
  }

  function readForecastCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.savedAt || !parsed?.data) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function writeForecastCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), data }));
    } catch {
      // ignore quota/serialization errors
    }
  }

async function geocode(q) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`;
        const r = await fetch(url, signal ? { signal } : undefined);
    if (!r.ok) throw new Error("Geocoding failed.");
    const j = await r.json();
    if (!j?.results?.length) throw new Error("No matching locations found.");
    const g = j.results[0];
    return {
      name: [g.name, g.admin1, g.country_code].filter(Boolean).join(", "),
      lat: g.latitude,
      lon: g.longitude,
      tz: g.timezone || "UTC",
    };
  }

  async function forecastFor(lat, lon, tz, signal) {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,visibility,wind_speed_10m,relative_humidity_2m,temperature_2m,dew_point_2m` +
      `&forecast_days=2&timezone=${encodeURIComponent(tz)}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("Forecast fetch failed.");
    const j = await r.json();
    if (!j?.hourly?.time?.length) throw new Error("Forecast data missing.");
    return j;
  }

  async function airQualityFor(lat, lon, tz, signal) {
    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
      `&hourly=pm2_5,pm10,aerosol_optical_depth&forecast_days=2&timezone=${encodeURIComponent(tz)}`;
    const r = await fetch(url, signal ? { signal } : undefined);
    if (!r.ok) throw new Error("Air quality fetch failed.");
    const j = await r.json();
    if (!j?.hourly?.time?.length) throw new Error("Air quality data missing.");
    return j;
  }

  function airqCacheKey(lat, lon, tz) {
    const d = new Date();
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, "0");
    const dd = String(day.getDate()).padStart(2, "0");
    const keyDay = `${y}-${m}-${dd}`;
    return `astrocast_airq_v1:${lat.toFixed(3)},${lon.toFixed(3)}:${tz}:${keyDay}`;
  }

  function computeNightWindow(lat, lon, date) {
    // Estimate astronomical night by scanning hourly between 6pm and 9am.
    const start = new Date(date);
    start.setHours(18, 0, 0, 0);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    end.setHours(9, 0, 0, 0);

    let inNight = false;
    let nightStart = null;
    let nightEnd = null;

    for (let t = new Date(start); t <= end; t = new Date(t.getTime() + 60 * 60 * 1000)) {
      const obs = new Astronomy.Observer(lat, lon, 0);
      const sunEq = Astronomy.Equator(Astronomy.Body.Sun, t, obs, true, true);
      const sunHor = Astronomy.Horizon(t, obs, sunEq.ra, sunEq.dec, "normal");
      const isAstroDark = sunHor.altitude <= -18;
      if (isAstroDark && !inNight) {
        inNight = true;
        nightStart = new Date(t);
      }
      if (!isAstroDark && inNight) {
        inNight = false;
        nightEnd = new Date(t);
        break;
      }
    }

    if (nightStart && !nightEnd) nightEnd = new Date(end);
    return nightStart ? { start: nightStart, end: nightEnd } : null;
  }

  function computeMoonAndPlanets(lat, lon, when) {
    const obs = new Astronomy.Observer(lat, lon, 0);

    const moonIll = Astronomy.Illumination(Astronomy.Body.Moon, when);
    const moonEq = Astronomy.Equator(Astronomy.Body.Moon, when, obs, true, true);
    const moonHor = Astronomy.Horizon(when, obs, moonEq.ra, moonEq.dec, "normal");

    const moon = {
      phaseDeg: Astronomy.MoonPhase(when),
      name: moonPhaseLabel(when, moonIll.phase_fraction),
      illum: moonIll.phase_fraction,
      // Equatorial coordinates (needed for moon-target separation scoring)
      raHours: moonEq.ra,
      decDeg: moonEq.dec,
      // Horizontal coordinates
      alt: moonHor.altitude,
      az: moonHor.azimuth,
      azCard: cardinalFromAz(moonHor.azimuth),
    };

    const bodies = [
      { key: "Mercury", body: Astronomy.Body.Mercury },
      { key: "Venus", body: Astronomy.Body.Venus },
      { key: "Mars", body: Astronomy.Body.Mars },
      { key: "Jupiter", body: Astronomy.Body.Jupiter },
      { key: "Saturn", body: Astronomy.Body.Saturn },
      { key: "Uranus", body: Astronomy.Body.Uranus },
      { key: "Neptune", body: Astronomy.Body.Neptune },
    ];

    const planets = bodies
      .map((b) => {
        const eq = Astronomy.Equator(b.body, when, obs, true, true);
        const hor = Astronomy.Horizon(when, obs, eq.ra, eq.dec, "normal");
        return { name: b.key, alt: hor.altitude, az: hor.azimuth, azCard: cardinalFromAz(hor.azimuth) };
      })
      .filter((p) => p.alt > 0);

    return { moon, planets };
  }

  
  function angularDistanceHorizonDeg(alt1, az1, alt2, az2) {
    const a1 = (clamp(alt1 ?? -90, -90, 90) * Math.PI) / 180;
    const a2 = (clamp(alt2 ?? -90, -90, 90) * Math.PI) / 180;
    const z1 = (az1 ?? 0) * Math.PI / 180;
    const z2 = (az2 ?? 0) * Math.PI / 180;

    // Horizon frame: x=east, y=north, z=up. Azimuth measured from north toward east.
    const v1x = Math.cos(a1) * Math.sin(z1);
    const v1y = Math.cos(a1) * Math.cos(z1);
    const v1z = Math.sin(a1);

    const v2x = Math.cos(a2) * Math.sin(z2);
    const v2y = Math.cos(a2) * Math.cos(z2);
    const v2z = Math.sin(a2);

    const dot = clamp(v1x * v2x + v1y * v2y + v1z * v2z, -1, 1);
    return (Math.acos(dot) * 180) / Math.PI;
  }
function angularSeparationDeg(raHours1, decDeg1, raHours2, decDeg2) {
    // Robust spherical separation (degrees). ra in hours, dec in degrees.
    const ra1 = (raHours1 ?? 0) * 15 * (Math.PI / 180);
    const ra2 = (raHours2 ?? 0) * 15 * (Math.PI / 180);
    const d1 = (decDeg1 ?? 0) * (Math.PI / 180);
    const d2 = (decDeg2 ?? 0) * (Math.PI / 180);

    const cos =
      Math.sin(d1) * Math.sin(d2) +
      Math.cos(d1) * Math.cos(d2) * Math.cos(ra1 - ra2);

    return Math.acos(clamp(cos, -1, 1)) * (180 / Math.PI);
  }

  function computeBestTargets({ lat, lon, hourlyRows, targets, windowHours, minAltDeg }) {
    if (!hourlyRows?.length || !targets?.length) return [];

    const obs = new Astronomy.Observer(lat, lon, 0);

    // Only score during astronomical dark for "imaging grade" ranking.
    const dark = hourlyRows.filter((r) => r.isDark);

    // Require consecutive hours for window scoring.
    const isConsecutiveHour = (a, b) => Math.abs((b.t - a.t) / 3600000 - 1) < 0.01;

    const results = [];

    for (const target of targets) {
      const raH = target.raDeg / 15;
      const decD = target.decDeg;

      // Build per-hour metrics for this target during dark.
      const per = [];
      for (let i = 0; i < dark.length; i++) {
        const r = dark[i];
        const hor = Astronomy.Horizon(r.t, obs, raH, decD, "normal");
        const alt = hor.altitude;
        if (alt < minAltDeg) {
          per.push(null);
          continue;
        }

        const moonAlt = r.moonAlt ?? -90;
        const moonIll = clamp(r.moonIllum ?? 0, 0, 1);

        // Moon separation penalty (strongly matters for imaging).
        let sep = 180;
        if (typeof r.moonRaHours === "number" && typeof r.moonDecDeg === "number") {
          sep = angularSeparationDeg(raH, decD, r.moonRaHours, r.moonDecDeg);
        }

        // sepFactor: 0 when far away, 1 when close (<~60°).
        const sepFactor = Math.pow(clamp((60 - sep) / 60, 0, 1), 1.4);

        // altFactor: moon high hurts more than moon low.
        const moonAltFactor = moonAlt > 0 ? Math.pow(clamp((moonAlt - 3) / 60, 0, 1), 1.2) : 0;

        // net moon penalty. (later we can incorporate sky brightness model / extinction)
        const moonPenalty = moonAlt > 0 ? Math.pow(moonIll, 1.35) * moonAltFactor * sepFactor * 46 : 0;

        // Target altitude bonus: higher is better (less airmass).
        const altBonus = Math.pow(clamp((alt - minAltDeg) / (90 - minAltDeg), 0, 1), 0.85) * 12;

        const hourScore = clamp((r.scoreAdj ?? r.score ?? 0) + altBonus - moonPenalty, 0, 100);

        per.push({
          t: r.t,
          hourScore,
          alt,
          az: hor.azimuth,
          azCard: cardinalFromAz(hor.azimuth),
          moonSep: sep,
        });
      }

      // Sliding window (2–4 hours): maximize average hourScore, requiring consecutive hours.
      let best = null;

      for (let i = 0; i < per.length; i++) {
        // window must have all points present + consecutive timestamps
        let ok = true;
        let sum = 0;
        let peakAlt = -1;
        let midSep = 180;

        for (let k = 0; k < windowHours; k++) {
          const p = per[i + k];
          if (!p) { ok = false; break; }
          if (k > 0) {
            const prev = per[i + k - 1];
            if (!prev || !isConsecutiveHour(prev, p)) { ok = false; break; }
          }
          sum += p.hourScore;
          peakAlt = Math.max(peakAlt, p.alt);
          if (k === Math.floor(windowHours / 2)) midSep = p.moonSep;
        }

        if (!ok) continue;

        const avg = sum / windowHours;
        if (!best || avg > best.avg) {
          best = {
            avg,
            start: per[i].t,
            end: per[i + windowHours - 1].t,
            peakAlt,
            midSep,
          };
        }
      }

      if (best) {
        results.push({
          name: target.name,
          type: target.type,
          score: Math.round(best.avg),
          bestStart: best.start,
          bestEnd: best.end,
          peakAlt: best.peakAlt,
          moonSep: best.midSep,
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }

  function computeBestWindowForPointing({ hourlyRows, pointing, windowHours, minAltDeg }) {
    if (!hourlyRows?.length || !pointing) return null;
    const wh = clamp(windowHours || 3, 2, 4);

    // If user points below the minimum altitude, there is no "imaging-grade" window by definition.
    if (Number.isFinite(minAltDeg) && Number.isFinite(pointing.alt) && pointing.alt < minAltDeg) return null;

    let bestW = null;

    for (let s = 0; s < hourlyRows.length; s++) {
      let ok = true;
      let sum = 0;

      for (let k = 0; k < wh; k++) {
        const r = hourlyRows[s + k];
        if (!r) { ok = false; break; }
        if (!r.isDark) { ok = false; break; }

        const base = r.scoreAdj ?? r.score ?? 0;

        const moonAlt = r.moonAlt ?? -90;
        const moonIll = clamp(r.moonIllum ?? 0, 0, 1);

        const moonAz = Number.isFinite(r.moonAz) ? r.moonAz : 0;

        const sep = angularDistanceHorizonDeg(pointing.alt, pointing.az, moonAlt, moonAz);

        const sepFactor = Math.pow(clamp((60 - sep) / 60, 0, 1), 1.4);
        const moonAltFactor = moonAlt > 0 ? Math.pow(clamp((moonAlt - 3) / 60, 0, 1), 1.2) : 0;
        const moonPenalty = moonAlt > 0 ? Math.pow(moonIll, 1.35) * moonAltFactor * sepFactor * 46 : 0;

        const hourScore = clamp(base - moonPenalty, 0, 100);
        sum += hourScore;
      }

      if (!ok) continue;
      const avg = sum / wh;
      if (!bestW || avg > bestW.avgPointingScore) {
        bestW = { startIndex: s, endIndex: s + wh - 1, hours: wh, avgPointingScore: avg };
      }
    }

    return bestW;
  }



  async function loadForLocation(nextLoc) {
    setErr("");

    // Abort any in-flight forecast request (prevents race conditions when switching locations quickly).
    try {
      if (forecastAbortRef.current) forecastAbortRef.current.abort();
    } catch {}

    const controller = new AbortController();
    forecastAbortRef.current = controller;

    const cacheKey = forecastCacheKey(nextLoc.lat, nextLoc.lon, nextLoc.tz);
    const cached = readForecastCache(cacheKey);

    const processForecast = (j, aq) => {
      const times = j.hourly.time.map((s) => new Date(s));
      const aqByIso = new Map();
      if (aq?.hourly?.time?.length) {
        for (let k = 0; k < aq.hourly.time.length; k++) {
          aqByIso.set(aq.hourly.time[k], {
            pm25: aq.hourly.pm2_5?.[k],
            pm10: aq.hourly.pm10?.[k],
            aod: aq.hourly.aerosol_optical_depth?.[k],
          });
        }
      }

            const now = new Date();
            const day = new Date(now);
            day.setHours(0, 0, 0, 0);

            const win = computeNightWindow(nextLoc.lat, nextLoc.lon, new Date(day));
            setNightWindow(win);

            const start = new Date(day);
            start.setHours(18, 0, 0, 0);
            const end = new Date(day);
            end.setDate(end.getDate() + 1);
            end.setHours(9, 0, 0, 0);

            const rows = [];
            let lastTempC = null;
            for (let i = 0; i < times.length; i++) {
              const t = times[i];
              if (t < start || t > end) continue;

              const { moon } = computeMoonAndPlanets(nextLoc.lat, nextLoc.lon, t);

              const obs = new Astronomy.Observer(nextLoc.lat, nextLoc.lon, 0);
              const sunEq = Astronomy.Equator(Astronomy.Body.Sun, t, obs, true, true);
              const sunHor = Astronomy.Horizon(t, obs, sunEq.ra, sunEq.dec, "normal");
              const isDark = sunHor.altitude <= -18;

              const visibilityKm = (j.hourly.visibility?.[i] ?? 0) / 1000;
              const aqRow = aqByIso.get(j.hourly.time[i]);
              const pm25 = aqRow?.pm25;
              const aod = aqRow?.aod;
              const transparencyScore = computeTransparencyScore({ visibilityKm, pm25, aod });

              const windMps = (j.hourly.wind_speed_10m?.[i] ?? 0) / 3.6;
              const tempC = j.hourly.temperature_2m?.[i];
              const tempDeltaC = Number.isFinite(tempC) && Number.isFinite(lastTempC) ? Math.abs(tempC - lastTempC) : 0;
              const seeingScore = computeSeeingScore({ windMps, tempDeltaC });
              lastTempC = Number.isFinite(tempC) ? tempC : lastTempC;

              const score = scoreHour({
                transparencyScore,
                seeingScore,
                cloud: j.hourly.cloud_cover?.[i],
                cloudLow: j.hourly.cloud_cover_low?.[i],
                cloudMid: j.hourly.cloud_cover_mid?.[i],
                cloudHigh: j.hourly.cloud_cover_high?.[i],
                visibilityKm,
                windMps,
                humidity: j.hourly.relative_humidity_2m?.[i],
                tempC,
                dewpointC: j.hourly.dew_point_2m?.[i],
                moonAltDeg: moon.alt,
                moonIllum: moon.illum,
              });

              const dewRiskPct =
                typeof j.hourly.dew_point_2m?.[i] === "number" && typeof j.hourly.temperature_2m?.[i] === "number"
                  ? Math.round(clamp((4 - (j.hourly.temperature_2m[i] - j.hourly.dew_point_2m[i])) / 4, 0, 1) * 100)
                  : 0;

              // Extra moonlight penalty used for window picking (keeps UX consistent with how people plan sessions).
              const moonPenaltyForWindow =
                moon.alt > 0 ? Math.pow(clamp(moon.illum, 0, 1), 1.25) * Math.pow(clamp((moon.alt - 3) / 60, 0, 1), 1.35) * 32 : 0;

              const scoreAdj = Math.round(clamp(score - moonPenaltyForWindow * 0.35, 0, 100));

              rows.push({
                t,
                score,
                scoreAdj,
                isDark,
                cloud: j.hourly.cloud_cover?.[i],
                low: j.hourly.cloud_cover_low?.[i],
                mid: j.hourly.cloud_cover_mid?.[i],
                high: j.hourly.cloud_cover_high?.[i],
                dewRiskPct,
                transparencyScore,
                seeingScore,
                visibilityKm,
                windMph: (j.hourly.wind_speed_10m?.[i] ?? 0) * 0.621371,
                humidity: j.hourly.relative_humidity_2m?.[i],
                moonAlt: moon.alt,
                moonAz: moon.az,
                moonAltDeg: moon.alt,
                moonAzDeg: moon.az,
                moonIllum: moon.illum,
                moonRaHours: moon.raHours,
                moonDecDeg: moon.decDeg,
              });
            }

            rows.sort((a, b) => a.t - b.t);
            setHourly(rows);

            const best = rows.reduce((acc, r) => (!acc || r.score > acc.score ? r : acc), null);
            setBestHour(best);

            // Pick best contiguous window (2–4 hours) *during astronomical darkness*.
            const wh = clamp(windowHours || 3, 2, 4);
            let bestW = null;

            for (let s = 0; s < rows.length; s++) {
              // require the whole window to be within astro-dark
              let ok = true;
              let sum = 0;
              for (let k = 0; k < wh; k++) {
                const r = rows[s + k];
                if (!r) { ok = false; break; }
                if (!r.isDark) { ok = false; break; }
                sum += r.scoreAdj;
              }
              if (!ok) continue;
              const avg = sum / wh;
              if (!bestW || avg > bestW.avgScoreAdj) {
                bestW = { startIndex: s, endIndex: s + wh - 1, hours: wh, avgScoreAdj: avg };
              }
            }
            setBestWindow(bestW);
            const when = best ? best.t : rows[0]?.t;
            if (when) {
              const { moon, planets } = computeMoonAndPlanets(nextLoc.lat, nextLoc.lon, when);
              
setMoonInfo({ ...moon, when });

// Moon + Sun rise/set and next key phases for planning.
try {
  const obs = new Astronomy.Observer(nextLoc.lat, nextLoc.lon, 0);
  const day0 = new Date(when);
  day0.setHours(0, 0, 0, 0);

  const moonRise = Astronomy.SearchRiseSet(Astronomy.Body.Moon, obs, +1, day0, 2);
  const moonSet = Astronomy.SearchRiseSet(Astronomy.Body.Moon, obs, -1, day0, 2);
  const sunRise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, +1, day0, 2);
  const sunSet = Astronomy.SearchRiseSet(Astronomy.Body.Sun, obs, -1, day0, 2);

  const nextPhases = [];
  let t0 = new Date(when);
  for (let k = 0; k < 4; k++) {
    const q = Astronomy.SearchMoonQuarter(t0);
    if (!q) break;
    const label =
      q.quarter === 0 ? "New Moon" :
      q.quarter === 1 ? "First Quarter" :
      q.quarter === 2 ? "Full Moon" :
      "Last Quarter";
    nextPhases.push({ label, time: q.time });
    t0 = new Date(q.time.getTime() + 60_000);
  }

  setMoonExtra({
    moonRise: moonRise?.time || null,
    moonSet: moonSet?.time || null,
    sunRise: sunRise?.time || null,
    sunSet: sunSet?.time || null,
    nextPhases,
  });
} catch {
  setMoonExtra(null);
}

              setPlanetRows(planets.filter((p) => p.alt > 10).sort((a, b) => b.alt - a.alt).slice(0, 7));
            } else {
              setMoonInfo(null);
              setMoonExtra(null);
              setPlanetRows([]);
              setTargetRows([]);
            }
    
    };

    // Stale-while-revalidate: render cached data immediately (if present), then refresh in background.
    if (cached?.data) {
      try {
        const aqKey = airqCacheKey(nextLoc.lat, nextLoc.lon, nextLoc.tz);
        const aqCached = readCache(aqKey, 30 * 60 * 1000);
        if (aqCached?.data) {
          setAirq(aqCached.data);
          setAirqMeta({ source: "cache", savedAt: aqCached.savedAt });
        } else {
          setAirq(null);
          setAirqMeta(null);
        }

        processForecast(cached.data, aqCached?.data || null);
        setForecastMeta({ source: "cache", savedAt: cached.savedAt });
      } catch {}
    }

    setLoading(true);
    try {
      const aqKey = airqCacheKey(nextLoc.lat, nextLoc.lon, nextLoc.tz);
      const settled = await Promise.allSettled([
        forecastFor(nextLoc.lat, nextLoc.lon, nextLoc.tz, controller.signal),
        airQualityFor(nextLoc.lat, nextLoc.lon, nextLoc.tz, controller.signal),
      ]);
      const j = settled[0].status === "fulfilled" ? settled[0].value : null;
      const aqJ = settled[1].status === "fulfilled" ? settled[1].value : null;
      if (!j) throw settled[0].reason || new Error("Forecast fetch failed.");
      if (forecastAbortRef.current !== controller) return; // stale response

      writeForecastCache(cacheKey, j);
      setForecastMeta({ source: "live", savedAt: new Date().toISOString() });

      if (aqJ) {
        writeCache(aqKey, aqJ);
        setAirq(aqJ);
        setAirqMeta({ source: "live", savedAt: new Date().toISOString() });
      } else {
        // keep any cached air quality; if none, clear
        const aqCached = readCache(aqKey, 30 * 60 * 1000);
        if (aqCached?.data) {
          setAirq(aqCached.data);
          setAirqMeta({ source: "cache", savedAt: aqCached.savedAt });
        } else {
          setAirq(null);
          setAirqMeta(null);
        }
      }

      processForecast(j, aqJ || readCache(aqKey, 30 * 60 * 1000)?.data || null);
    } catch (e) {
      if (e?.name === "AbortError") return;

      if (cached?.data) {
        setErr("Live forecast unavailable — showing last saved forecast.");
      } else {
        setErr(e?.message || "Something went wrong.");
      }
    } finally {
      if (forecastAbortRef.current === controller) setLoading(false);
    }
  }

  async function onSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setErr("");
    try {
      const g = await geocode(query.trim());
      setLoc(g);
      await loadForLocation(g);
    } catch (e) {
      setErr(e?.message || "Search failed.");
      setLoading(false);
    }
  }

  async function onUseMyLocation() {
    setErr("");
    setLoading(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) reject(new Error("Geolocation not supported."));
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000 });
      });
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const g = { name: "My Location", lat, lon, tz };
      setLoc(g);
      await loadForLocation(g);
    } catch {
      setErr("Couldn’t get your location. Allow location access, or search a city/ZIP.");
      setLoading(false);
    }
  }

  const headline = bestHour ? scoreLabel(bestHour.score) : null;


  const bestWindowLabel = useMemo(() => {
    if (!bestWindow || !hourly?.length) return null;
    const s = hourly[bestWindow.startIndex];
    const e = hourly[bestWindow.endIndex];
    if (!s || !e) return null;
    return `${formatTime(s.t, loc?.tz)} – ${formatTime(e.t, loc?.tz)} (${bestWindow.hours}h)`;
  }, [bestWindow, hourly, loc?.tz]);

  const avgWindowScore = bestWindow ? Math.round(bestWindow.avgScoreAdj ?? 0) : null;


  const transparencyAtBest = useMemo(() => {
    if (!hourly?.length) return null;
    let idx = null;
    if (bestWindow) {
      idx = Math.round((bestWindow.startIndex + bestWindow.endIndex) / 2);
    } else if (bestHour) {
      idx = hourly.findIndex((r) => r.t?.getTime?.() === bestHour.t?.getTime?.());
      if (idx < 0) idx = null;
    }
    const r = idx != null ? hourly[idx] : hourly[Math.floor(hourly.length / 2)];
    if (!r) return null;
    return {
      score: r.transparencyScore,
      pm25: r.pm25,
      aod: r.aod,
      visibilityKm: r.visibilityKm,
      t: r.t,
    };
  }, [hourly, bestWindow, bestHour]);

  const seeingAtBest = useMemo(() => {
    const idx = bestWindow?.midIndex ?? bestHour?.index ?? null;
    const r = idx != null ? hourly?.[idx] : null;
    if (!r) return null;
    return { score: r.seeingScore, windMph: r.windMph, t: r.t };
  }, [hourly, bestWindow, bestHour]);


  // Simple moon altitude polyline for the hourly block (only the rows we show).
  const moonAltPolyline = useMemo(() => {
    const rows = hourly || [];
    if (!rows.length) return "";
    const w = 900;
    const h = 90;
    const padX = 10;
    const padY = 10;
    const xs = rows.map((_, i) => padX + (i * (w - padX * 2)) / Math.max(1, rows.length - 1));
    const ys = rows.map((r) => {
      const a = clamp(r.moonAltDeg ?? -90, -20, 90);
      const t = (a + 20) / 110; // 0..1
      return (h - padY) - t * (h - padY * 2);
    });
    return xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  }, [hourly]);

  const transparencyPolyline = useMemo(() => {
    const rows = hourly || [];
    if (!rows.length) return "";
    const w = 900;
    const h = 70;
    const padX = 10;
    const padY = 8;
    const xs = rows.map((_, i) => padX + (i * (w - padX * 2)) / Math.max(1, rows.length - 1));
    const ys = rows.map((r) => {
      const s = clamp((r.transparencyScore ?? 0) / 100, 0, 1);
      return (h - padY) - s * (h - padY * 2);
    });
    return xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  }, [hourly]);

  const seeingPolyline = useMemo(() => {
    const rows = hourly || [];
    if (!rows.length) return "";
    const w = 900;
    const h = 70;
    const padX = 10;
    const padY = 8;
    const xs = rows.map((_, i) => padX + (i * (w - padX * 2)) / Math.max(1, rows.length - 1));
    const ys = rows.map((r) => {
      const s = clamp((r.seeingScore ?? 0) / 100, 0, 1);
      return (h - padY) - s * (h - padY * 2);
    });
    return xs.map((x, i) => `${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  }, [hourly]);

  const milkyWayWindow = useMemo(() => {
    if (!loc?.lat || !loc?.lon || !hourly?.length || !nightWindow) return null;
    const obs = new Astronomy.Observer(loc.lat, loc.lon, 0);
    // Galactic Center (approx): RA 17h45m40s, Dec -29°00'
    const raHours = 17 + 45 / 60 + 40 / 3600;
    const decDeg = -29.0;
    const eligible = hourly
      .map((r, idx) => {
        const hor = Astronomy.Horizon(r.t, obs, raHours, decDeg, "normal");
        return { idx, t: r.t, alt: hor.altitude, isDark: !!r.isDark };
      })
      .filter((x) => x.isDark && x.alt >= 15);

    if (!eligible.length) return null;
    return { start: eligible[0].t, end: eligible[eligible.length - 1].t, maxAlt: Math.max(...eligible.map(e => e.alt)) };
  }, [loc, hourly, nightWindow]);



  if (!betaUnlocked) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.10),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.06),transparent_45%)]" />
        </div>

        {!embedded && (
          <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
              <button type="button" onClick={goHome} className="flex items-center gap-2 font-semibold tracking-wide" title="Back to Home">
                <Camera className="h-5 w-5" />
                <span>Jake Schultz Astrophotography</span>
              </button>
              <div className="text-xs text-white/50">Starcast</div>
            </div>
          </header>
        )}

        <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <img
                    src="/images/brand/logo.png"
                    alt="Logo"
                    className="h-10 w-auto opacity-90 select-none"
                    draggable={false}
                    onClick={handleSecretLogoTap}
                  />
                  <div className="text-xs text-white/45">Private beta</div>
                </div>
                <div
                  className="text-3xl font-semibold tracking-tight cursor-default select-none"
                  onClick={handleSecretTitleTap}
                  title="Starcast"
                >
                  Starcast
                </div>
                <div className="mt-2 text-white/60">
                  Coming soon. This planning tool is not available to the public yet.
                </div>
                <div className="mt-4 text-sm text-white/55">
                  You can still browse the rest of the site while Starcast is in private beta.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goHome}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                >
                  Back to Home
                </button>
              </div>
            </div>

            
            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-medium">What’s coming</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/60">
                  <li>Cloud layers, transparency, and seeing guidance</li>
                  <li>Accurate moon phase + altitude timeline</li>
                  <li>Aurora KP + solar wind indicators</li>
                  <li>Target ranking + framing + saved sessions</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-medium">Release plan</div>
                <div className="mt-2 text-sm text-white/60">
                  We’re validating accuracy, performance, and mobile UX before making Starcast public.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-medium">Beta access</div>
                <div className="mt-2 text-sm text-white/60">
                  Tap the <span className="text-white/80">Starcast</span> title 7 times to unlock.
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Subtle background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.06),transparent_35%),radial-gradient(circle_at_50%_80%,rgba(255,255,255,0.05),transparent_45%)]" />
      </div>

      {!embedded && (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-black/40 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <button type="button" onClick={goHome} className="flex items-center gap-2 font-semibold tracking-wide" title="Back to Home">
              <Camera className="h-5 w-5" />
              <span>Jake Schultz Astrophotography</span>
            </button>

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
            </div>
          </div>
        </header>
      )}

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="text-3xl font-semibold tracking-tight"
            >
              Starcast
            </motion.h1>
            <p className="mt-2 text-sm text-white/70">
              Planner-grade weather + moonlight + targets. (Cloud layers • Dew risk • Moon phase • Aurora Kp • Best windows)
            </p>
          </div>

          {!embedded && (
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/90 hover:bg-white/10"
            >
              ← Back to Home
            </a>
          )}
        </div>

        {/* Location controls */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <div className="text-sm text-white/70">City / ZIP</div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  <Search className="h-4 w-4 text-white/50" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g., Bloomington IN, Sedona AZ, 55401"
                    className="w-full bg-transparent text-sm text-white/85 outline-none placeholder:text-white/30"
                  />
                </div>
                <button
                  onClick={onSearch}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/85 hover:bg-white/15"
                >
                  Search
                </button>
                <button
                  onClick={onUseMyLocation}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm text-white/80 hover:bg-black/40"
                  title="Use my location"
                >
                  <MapPin className="h-4 w-4" />
                  Use My Location
                </button>
              </div>

              <div className="mt-2 text-xs text-white/55">
                Location: <span className="text-white/80">{loc?.name || "—"}</span>
                {forecastMeta?.savedAt ? (
                  <span className="ml-2 text-white/40">
                    • {forecastMeta.source === "cache" ? "cached" : "live"} • updated{" "}
                    {new Date(forecastMeta.savedAt).toLocaleString()}
                  </span>
                ) : null}
              </div>
              {err ? <div className="mt-2 text-sm text-red-300">{err}</div> : null}
            </div>

            <div className="text-sm text-white/70">
              {nightWindow ? (
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                  Astronomical Night:{" "}
                  <span className="text-white/85">
                    {formatTime(nightWindow.start, loc?.tz)} – {formatTime(nightWindow.end, loc?.tz)}
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">Astronomical Night: —</div>
              )}
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">Tonight</div>
            <div className="mt-1 text-lg font-semibold">Best imaging window</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold">{avgWindowScore != null ? avgWindowScore : "—"}</div>
                <div className="text-xs text-white/55">window score (0–100)</div>
              </div>
              <div className="text-right text-xs text-white/55">
                <div>Window</div>
                <div className="text-white/80">{bestWindowLabel || "—"}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-white/50">
              Score blends cloud layers, wind, dew risk, visibility proxy, and moonlight penalty.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">Moon</div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{moonInfo?.name || "—"}</div>
                <div className="text-xs text-white/55">{moonInfo ? `${Math.round((moonInfo.illum || 0) * 100)}% illuminated` : "—"}</div>
                {moonInfo ? (
                  <div className="mt-1 text-xs text-white/55">
                    Alt {Math.round(moonInfo.alt)}° • {moonInfo.azCard}
                  </div>
                ) : null}
              </div>
              <div className="shrink-0">
                {moonInfo ? <MoonPhaseCanvas fraction={moonInfo.illum} phaseDeg={moonInfo.phaseDeg} size={52} /> : null}
              </div>
            </div>

            {moonExtra?.moonRise && moonExtra?.moonSet ? (
              <div className="mt-2 text-xs text-white/55">
                Rise {formatTime(new Date(moonExtra.moonRise), loc?.tz)} • Set {formatTime(new Date(moonExtra.moonSet), loc?.tz)}
              </div>
            ) : null}

            {moonExtra?.nextPhases?.length ? (
              <div className="mt-3 space-y-1 text-xs text-white/55">
                <div className="text-white/60">Next phases</div>
                {moonExtra.nextPhases.slice(0, 3).map((p) => (
                  <div key={p.label + String(p.time)} className="flex items-center justify-between gap-3">
                    <span>{p.label}</span>
                    <span className="text-white/45">
                      {new Date(p.time).toLocaleDateString()} • {formatTime(new Date(p.time), loc?.tz)}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">Transparency</div>
            <div className="mt-1 text-lg font-semibold">Haze / smoke proxy</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold">
                  {Number.isFinite(transparencyAtBest?.score) ? transparencyAtBest.score : "—"}
                </div>
                <div className="text-xs text-white/55">transparency score (0–100)</div>
              </div>
              <div className="text-right">
                {(() => {
                  const t = transparencyLabel(transparencyAtBest?.score);
                  return (
                    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${t.cls}`}>
                      {t.label}
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/55">
              <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                <div className="text-white/45">Visibility</div>
                <div className="mt-0.5 text-white/80">
                  {Number.isFinite(transparencyAtBest?.visibilityKm) ? `${Math.round(transparencyAtBest.visibilityKm)} km` : "—"}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/20 p-2">
                <div className="text-white/45">PM2.5</div>
                <div className="mt-0.5 text-white/80">
                  {Number.isFinite(transparencyAtBest?.pm25) ? `${Math.round(transparencyAtBest.pm25)} µg/m³` : "—"}
                </div>
              </div>
              <div className="col-span-2 rounded-lg border border-white/10 bg-black/20 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/45">Aerosol optical depth</span>
                  <span className="text-white/80">
                    {Number.isFinite(transparencyAtBest?.aod) ? transparencyAtBest.aod.toFixed(2) : "—"}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-white/45">
                  Higher AOD / PM2.5 usually means haze or smoke → reduced contrast.
                </div>
              </div>
            </div>
          </div>

<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">Aurora</div>
            <div className="mt-1 text-lg font-semibold">NOAA Kp Index</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold">{aurora?.kpNow != null ? aurora.kpNow.toFixed(1) : "—"}</div>
                <div className="text-xs text-white/55">
                  {aurora?.source === "cache" ? "cached" : aurora?.source === "live" ? "live" : "unavailable"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/55">Max (last 3h)</div>
                <div className="text-xl font-semibold">{aurora?.kpMax3h != null ? aurora.kpMax3h.toFixed(1) : "—"}</div>
              </div>
            </div>
            <div className="mt-3 text-xs text-white/50">
              Planning note: Kp is a coarse indicator. Approximate oval preview below:
            </div>
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/30">
              <img
                src="https://services.swpc.noaa.gov/images/aurora-forecast-northern-hemisphere.png"
                alt="NOAA Aurora forecast (Northern Hemisphere)"
                className="h-auto w-full opacity-90"
                loading="lazy"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">Seeing</div>
            <div className="mt-1 text-lg font-semibold">Atmospheric steadiness (proxy)</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-semibold">
                  {Number.isFinite(seeingAtBest?.score) ? seeingAtBest.score : "—"}
                </div>
                <div className="text-xs text-white/55">seeing score (0–100)</div>
              </div>
              <div className="text-right">
                {(() => {
                  const s = seeingLabel(seeingAtBest?.score);
                  return (
                    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${s.cls}`}>
                      {s.label}
                    </span>
                  );
                })()}
                <div className="mt-2 text-xs text-white/55">
                  Wind: {Number.isFinite(seeingAtBest?.windMph) ? Math.round(seeingAtBest.windMph) : "—"} mph
                </div>
              </div>
            </div>
            <div className="mt-3 text-[11px] text-white/45">
              Proxy based on near-surface wind + temperature stability. Not true seeing (arcseconds), but useful for planning.
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/60">Milky Way</div>
            <div className="mt-1 text-lg font-semibold">Core visibility</div>
            <div className="mt-2">
              {milkyWayWindow ? (
                <>
                  <div className="text-sm text-white/70">Above 15° during astronomical night</div>
                  <div className="mt-1 text-xl font-semibold">
                    {formatTime(milkyWayWindow.start, loc?.tz)} – {formatTime(milkyWayWindow.end, loc?.tz)}
                  </div>
                  <div className="mt-1 text-xs text-white/55">
                    Peak altitude: {Math.round(milkyWayWindow.maxAlt)}°
                  </div>
                </>
              ) : (
                <div className="text-white/60">Not visible tonight (for this location / season).</div>
              )}
            </div>
          </div>

        </div>

        {/* Hourly planner */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold">Hourly Conditions (Tonight)</div>
              <div className="text-sm text-white/60">Cloud layers + dew risk + moon altitude overlay. Scroll horizontally on mobile.</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-white/60">Window</div>
              <select
                value={windowHours}
                onChange={(e) => setWindowHours(parseInt(e.target.value, 10))}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 outline-none"
              >
                <option value={2}>2 hours</option>
                <option value={3}>3 hours</option>
                <option value={4}>4 hours</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[980px] rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="relative">
                <svg viewBox="0 0 900 90" className="h-20 w-full">
                  <polyline points={moonAltPolyline} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" />
                  <text x="10" y="14" fontSize="10" fill="rgba(255,255,255,0.55)">Moon alt</text>
                </svg>
                  <svg viewBox="0 0 900 70" className="mt-2 h-16 w-full">
                    <polyline points={transparencyPolyline} fill="none" stroke="rgba(56,189,248,0.75)" strokeWidth="2" />
                    <text x="10" y="14" fontSize="10" fill="rgba(255,255,255,0.55)">Transparency</text>
                  </svg>
                  <svg viewBox="0 0 900 70" className="mt-1 h-16 w-full">
                    <polyline points={seeingPolyline} fill="none" stroke="rgba(167,139,250,0.75)" strokeWidth="2" />
                    <text x="10" y="14" fontSize="10" fill="rgba(255,255,255,0.55)">Seeing (proxy)</text>
                  </svg>

              </div>

              <div className="mt-2 grid grid-flow-col auto-cols-[72px] gap-2">
                {(hourly || []).map((r, idx) => {
                  const inWindow = bestWindow && idx >= bestWindow.startIndex && idx <= bestWindow.endIndex;
                  const isDark = !!r.isDark;
                  return (
                    <div
                      key={String(r.t)}
                      className={
                        "rounded-xl border px-2 py-2 text-center " +
                        (inWindow ? "border-white/30 bg-white/10" : "border-white/10 bg-black/20")
                      }
                    >
                      <div className="text-[11px] text-white/70">{formatTime(r.t, loc?.tz)}</div>
                      <div className="mt-1 text-sm font-semibold">{Math.round(r.scoreAdj ?? r.score ?? 0)}</div>
                      <div className="mt-1 text-[10px] text-white/50">{isDark ? "Astro dark" : "Twilight"}</div>

                      {/* Cloud stack */}
                      <div className="mt-2 h-10 overflow-hidden rounded-md border border-white/10 bg-black/30">
                        <div className="flex h-full flex-col">
                          <div className="flex-1" style={{ background: `rgba(255,255,255,${clamp((r.high ?? 0) / 100, 0, 1) * 0.35})` }} />
                          <div className="flex-1" style={{ background: `rgba(255,255,255,${clamp((r.mid ?? 0) / 100, 0, 1) * 0.35})` }} />
                          <div className="flex-1" style={{ background: `rgba(255,255,255,${clamp((r.low ?? 0) / 100, 0, 1) * 0.35})` }} />
                        </div>
                      </div>

                      <div className="mt-1 text-[10px] text-white/55">Dew {Math.round(r.dewRiskPct ?? 0)}%</div>


                      {/* Transparency band */}
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[10px] text-white/55">
                          <span>Trans</span>
                          <span>{Number.isFinite(r.transparencyScore) ? Math.round(r.transparencyScore) : '—'}</span>
                        </div>
                        <div className="mt-1 h-2 w-full overflow-hidden rounded-full border border-white/10 bg-black/30">
                          <div
                            className="h-full rounded-full bg-white/70"
                            style={{ width: `${clamp(r.transparencyScore ?? 0, 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 text-xs text-white/45">
                Clouds (stacked): High / Mid / Low • Scores include moonlight penalty for window picking.
              </div>
            </div>
          </div>
        </div>

        {/* Best targets */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-lg font-semibold">Best Targets Tonight</div>
              <div className="text-sm text-white/60">
                Ranked by your selected imaging window (dark hours only), target altitude, and moon separation.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs text-white/60">Min alt</div>
              <select
                value={minAltDeg}
                onChange={(e) => setMinAltDeg(parseInt(e.target.value, 10))}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 outline-none"
              >
                <option value={20}>20°</option>
                <option value={25}>25°</option>
                <option value={30}>30°</option>
                <option value={35}>35°</option>
                <option value={40}>40°</option>
              </select>
            </div>
          </div>

          {/* Add a custom target */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
            <div className="text-sm font-medium">Add custom target</div>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-5">
              <input
                value={newTarget.name}
                onChange={(e) => setNewTarget((p) => ({ ...p, name: e.target.value }))}
                placeholder="Name (e.g., Markarian's Chain)"
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 outline-none md:col-span-2"
              />
              <input
                value={newTarget.raDeg}
                onChange={(e) => setNewTarget((p) => ({ ...p, raDeg: e.target.value }))}
                placeholder="RA deg (e.g., 186.75)"
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 outline-none"
              />
              <input
                value={newTarget.decDeg}
                onChange={(e) => setNewTarget((p) => ({ ...p, decDeg: e.target.value }))}
                placeholder="Dec deg (e.g., 13.16)"
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/80 outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const name = (newTarget.name || "").trim();
                    const raDeg = parseFloat(newTarget.raDeg);
                    const decDeg = parseFloat(newTarget.decDeg);
                    if (!name || !Number.isFinite(raDeg) || !Number.isFinite(decDeg)) return;
                    setCustomTargets((arr) => [
                      ...arr,
                      { name, raDeg, decDeg, type: (newTarget.type || "Custom").trim() || "Custom" },
                    ]);
                    setNewTarget({ name: "", raDeg: "", decDeg: "", type: "Custom" });
                  }}
                  className="flex-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/15"
                >
                  Add
                </button>
                <button
                  onClick={() => setCustomTargets([])}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/70 hover:bg-black/40"
                  title="Clear custom targets"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-white/50">
              Tip: RA/Dec in degrees works best. (RA hours × 15 = RA degrees)
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="text-white/70">
                <tr className="border-b border-white/10">
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Score</th>
                  <th className="py-2 pr-3">Best window</th>
                  <th className="py-2 pr-3">Peak alt</th>
                  <th className="py-2 pr-3">Moon sep</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {(targetRows || []).slice(0, 14).map((r) => (
                  <tr key={r.name} className="border-b border-white/10 hover:bg-white/5">
                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                    <td className="py-2 pr-3 text-white/70">{r.type}</td>
                    <td className="py-2 pr-3">{Math.round(r.score)}</td>
                    <td className="py-2 pr-3 text-white/70">{r.windowLabel}</td>
                    <td className="py-2 pr-3">{Math.round(r.peakAlt)}°</td>
                    <td className="py-2 pr-3">{Math.round(r.moonSep)}°</td>
                  </tr>
                ))}
                {!targetRows?.length ? (
                  <tr>
                    <td className="py-3 text-white/60" colSpan={6}>
                      No targets ranked yet — waiting for forecast / darkness window.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-white/35">
          Starcast is under active development — next up: transparency/smoke model, seeing (jet stream), and Ovation auroral oval map.
        </div>
      </main>
    </div>
  );
}
