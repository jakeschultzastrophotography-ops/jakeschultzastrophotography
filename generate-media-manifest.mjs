#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const IMAGE_EXTS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg", ".tif", ".tiff"
]);

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function titleFromName(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\w/g, (m) => m.toUpperCase());
}

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, results);
    else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTS.has(ext)) results.push(full);
    }
  }
  return results;
}

function inferFolder(rootDir, filePath) {
  const rel = toPosix(path.relative(rootDir, path.dirname(filePath)));
  if (!rel || rel === ".") return "Images";
  const first = rel.split("/")[0] || "Images";
  return titleFromName(first);
}

function inferTags(rootDir, filePath) {
  const relDir = toPosix(path.relative(rootDir, path.dirname(filePath)));
  return relDir && relDir !== "."
    ? relDir.split("/").filter(Boolean).map((part) => titleFromName(part))
    : [];
}

const projectRoot = process.cwd();
const publicDir = path.join(projectRoot, "public");
const imagesDir = path.join(publicDir, "images");
const outputPath = path.join(publicDir, "media-manifest.json");

const files = walk(imagesDir);
const assets = files
  .sort((a, b) => a.localeCompare(b))
  .map((filePath) => {
    const relFromPublic = "/" + toPosix(path.relative(publicDir, filePath));
    const fileName = path.basename(filePath);
    const folder = inferFolder(imagesDir, filePath);
    const tags = inferTags(imagesDir, filePath);
    return {
      id: "asset_" + Buffer.from(relFromPublic).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 18),
      title: titleFromName(fileName),
      path: relFromPublic,
      folder,
      tags,
      source: "Auto-generated manifest",
      kind: "image"
    };
  });

const manifest = {
  generatedAt: new Date().toISOString(),
  generatedFrom: "/public/images",
  assetCount: assets.length,
  assets
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`Generated ${assets.length} media assets -> ${path.relative(projectRoot, outputPath)}`);
