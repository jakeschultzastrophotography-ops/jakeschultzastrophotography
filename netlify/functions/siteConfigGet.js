import fs from "node:fs/promises";
import path from "node:path";

const GITHUB_API = "https://api.github.com";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function decodeBase64Utf8(value) {
  return Buffer.from(value, "base64").toString("utf8");
}

async function getGithubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const siteConfigPath = process.env.GITHUB_SITE_CONFIG_PATH || "public/site-config.json";

  if (!token || !owner || !repo) return null;

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(siteConfigPath).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data?.content) return null;
  return JSON.parse(decodeBase64Utf8(data.content));
}

async function getBundledConfig() {
  const filePath = path.resolve(process.cwd(), "public", "site-config.json");
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed." });

  try {
    const config = (await getGithubConfig()) || (await getBundledConfig());
    return json(200, config);
  } catch (error) {
    return json(500, { error: error.message || "Load failed." });
  }
}
