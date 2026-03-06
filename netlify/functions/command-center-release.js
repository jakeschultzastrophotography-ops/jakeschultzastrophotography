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
    const json = await res.json();
    return json.sha || null;
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

function buildSiteVersionModule({ siteVersion, releaseName, releaseDate }) {
  return `export const SITE_VERSION = ${JSON.stringify(siteVersion)};\nexport const RELEASE_NAME = ${JSON.stringify(releaseName)};\nexport const RELEASE_DATE = ${JSON.stringify(releaseDate)};\n`;
}

function buildVersionJson({ siteVersion, releaseName, releaseDate, releaseNotes, publicSiteUrl, generatedAt }) {
  return JSON.stringify(
    {
      version: siteVersion,
      releaseName,
      releaseDate,
      releaseNotes,
      publicSiteUrl,
      generatedAt,
      source: "command-center-release",
    },
    null,
    2
  );
}

function buildReleaseManifest({ siteVersion, releaseName, releaseDate, releaseNotes, publicSiteUrl, builderConfig, generatedAt }) {
  return JSON.stringify(
    {
      version: siteVersion,
      releaseName,
      releaseDate,
      releaseNotes,
      publicSiteUrl,
      generatedAt,
      builderConfig: builderConfig || null,
    },
    null,
    2
  );
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
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const owner = process.env.GITHUB_OWNER || requireEnv("GITHUB_OWNER");
    const repo = process.env.GITHUB_REPO || requireEnv("GITHUB_REPO");
    const branch = process.env.GITHUB_BRANCH || "main";
    const versionPath = process.env.GITHUB_VERSION_MODULE_PATH || "src/siteVersion.js";
    const versionJsonPath = process.env.GITHUB_VERSION_JSON_PATH || "version.json";
    const releaseManifestPath = process.env.GITHUB_RELEASE_MANIFEST_PATH || "public/command-center-release.json";
    const siteConfigPath = process.env.GITHUB_SITE_CONFIG_PATH || "public/site-config.json";

    const body = JSON.parse(event.body || "{}");
    const siteVersion = body.siteVersion || "v0.0.0";
    const releaseName = body.releaseName || "Command Center Release";
    const releaseDate = body.releaseDate || new Date().toISOString().slice(0, 10);
    const releaseNotes = body.releaseNotes || "Released from Command Center";
    const publicSiteUrl = body.publicSiteUrl || "";
    const builderConfig = body.builderConfig || null;
    const generatedAt = new Date().toISOString();
    const commitMessage = `Release ${siteVersion} from Command Center`;

    const writeResults = [];

    writeResults.push(
      await upsertFile({
        owner,
        repo,
        branch,
        path: versionPath,
        message: commitMessage,
        content: buildSiteVersionModule({ siteVersion, releaseName, releaseDate }),
      })
    );

    writeResults.push(
      await upsertFile({
        owner,
        repo,
        branch,
        path: versionJsonPath,
        message: commitMessage,
        content: buildVersionJson({ siteVersion, releaseName, releaseDate, releaseNotes, publicSiteUrl, generatedAt }),
      })
    );

    writeResults.push(
      await upsertFile({
        owner,
        repo,
        branch,
        path: releaseManifestPath,
        message: commitMessage,
        content: buildReleaseManifest({ siteVersion, releaseName, releaseDate, releaseNotes, publicSiteUrl, builderConfig, generatedAt }),
      })
    );

    if (builderConfig) {
      writeResults.push(
        await upsertFile({
          owner,
          repo,
          branch,
          path: siteConfigPath,
          message: commitMessage,
          content: JSON.stringify(builderConfig, null, 2),
        })
      );
    }

    const deploy = await triggerBuildHook();
    const finalCommitUrl = writeResults[writeResults.length - 1]?.commit?.html_url || writeResults[0]?.commit?.html_url || "";

    return json(200, {
      ok: true,
      owner,
      repo,
      branch,
      commitUrl: finalCommitUrl,
      deployTriggered: deploy.triggered,
      filesWritten: [versionPath, versionJsonPath, releaseManifestPath].concat(builderConfig ? [siteConfigPath] : []),
    });
  } catch (error) {
    return json(500, {
      error: error.message || "Release failed.",
    });
  }
}
