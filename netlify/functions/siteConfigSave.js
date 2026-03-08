const GITHUB_API = "https://api.github.com";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function githubFetch(path, options = {}) {
  const token = requireEnv("GITHUB_TOKEN");
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  return res;
}

async function getFileSha({ owner, repo, path, branch }) {
  try {
    const res = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`);
    const data = await res.json();
    return data.sha || null;
  } catch (err) {
    if (String(err.message).includes("GitHub API 404")) return null;
    throw err;
  }
}

async function upsertFile({ owner, repo, branch, path, content, message }) {
  const sha = await getFileSha({ owner, repo, path, branch });
  const body = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch,
    ...(sha ? { sha } : {}),
  };

  const res = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function triggerBuildHook() {
  const hook = process.env.NETLIFY_BUILD_HOOK_URL;
  if (!hook) return { triggered: false };
  const res = await fetch(hook, { method: "POST" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Netlify build hook ${res.status}: ${text}`);
  }
  return { triggered: true };
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." });

  try {
    const body = JSON.parse(event.body || "{}");
    if (!body || body.version !== 2) {
      return json(400, { error: "Expected a v2 site config payload." });
    }

    const owner = process.env.GITHUB_OWNER || requireEnv("GITHUB_OWNER");
    const repo = process.env.GITHUB_REPO || requireEnv("GITHUB_REPO");
    const branch = process.env.GITHUB_BRANCH || "main";
    const siteConfigPath = process.env.GITHUB_SITE_CONFIG_PATH || "public/site-config.json";

    const nextConfig = { ...body, updatedAt: new Date().toISOString() };
    const write = await upsertFile({
      owner,
      repo,
      branch,
      path: siteConfigPath,
      message: `Update site config ${nextConfig.updatedAt}`,
      content: JSON.stringify(nextConfig, null, 2),
    });

    const deploy = await triggerBuildHook();

    return json(200, {
      ok: true,
      deployTriggered: deploy.triggered,
      branch,
      path: siteConfigPath,
      commitUrl: write?.commit?.html_url || "",
      updatedAt: nextConfig.updatedAt,
    });
  } catch (error) {
    return json(500, { error: error.message || "Save failed." });
  }
}
