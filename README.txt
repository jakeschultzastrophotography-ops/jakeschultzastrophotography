Updated package: Command Center Deploy Panel v2.0.1

Files and where they go:
- AstrophotographySite.jsx -> place in src/
- AdminDashboard.jsx -> place in src/
- DashboardHome.jsx -> place in src/
- Starcast.jsx -> place in src/
- siteVersion.js -> place in src/
- README.txt -> place in project root or keep for reference

What changed:
- /admin keeps the Command Center as the default admin homepage
- added a real Deploy Panel to the Command Center
- stores Netlify build hook settings in browser localStorage
- lets you trigger a deploy for v2.0.1 directly from the dashboard
- keeps a local deploy history log
- removed the Saturn password gate from the editor

How to use deploy panel:
1. Open /admin
2. Find Deploy Panel
3. Paste your Netlify build hook URL
4. Click Deploy v2.0.1

Notes:
- This triggers a Netlify build hook. It does not commit code for you.
- Make sure your latest local/project files are already in place before deploying.
