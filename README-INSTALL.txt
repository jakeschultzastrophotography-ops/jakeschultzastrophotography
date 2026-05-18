Jake Schultz Astrophotography — Patch 2.4.3

Purpose:
- Adds the Elfsight Instagram Feed widget to the existing home page Instagram section.
- Uses the exact Elfsight app ID from your embed code: 76fb801f-a4ee-4a42-9b24-7456926d123d.
- Keeps the existing homepage layout and other site features unchanged.

Replace these files in your project:
- src/AstrophotographySite.jsx
- src/siteVersion.js
- public/site-config.json

Only use this file if doing a direct dist deploy:
- dist/site-config.json

After replacing files:
1. Run: npm run build
2. Commit/push or deploy normally.

Notes:
- Elfsight uses a platform script plus an app div, not a normal iframe URL.
- The widget is configured in public/site-config.json under instagramFeed.elfsightAppId.
