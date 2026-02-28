Cool — here’s a clean **Astro + GitHub Pages** spec with:

* **2 editable pages**: Home + Downloads (written in Markdown)
* **Automatic deploy** to GitHub Pages via GitHub Actions
* **Automatic downloads list** pulled from your **latest GitHub Release assets**
* Optional: **release CI** (so tagging `vX.Y.Z` publishes binaries that appear on the downloads page)

Everything below is copy/paste ready.

---

## What you’ll get

* `https://<you>.github.io/lepupitre/` → Home
* `https://<you>.github.io/lepupitre/downloads/` → Download page with buttons + release notes link
* Edit content by editing `src/pages/*.md` (pure Markdown)
* Deploy happens automatically on push to `main`

Astro deployment to GitHub Pages via GitHub Actions is officially documented. ([docs.astro.build][1])

---

## 1) Repo structure (add a `website/` folder)

At your repo root:

```
website/
  package.json
  astro.config.mjs
  public/
    downloads.js
  src/
    pages/
      index.md
      downloads.md
    layouts/
      Base.astro
.github/
  workflows/
    pages.yml
    release.yml          # optional (for desktop app assets)
```

---

## 2) Create the Astro site

### `website/package.json`

```json
{
  "name": "lepupitre-site",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.0.0"
  }
}
```

Install once locally:

```bash
cd website
npm install
```

---

## 3) Astro config for GitHub Pages

### `website/astro.config.mjs`

Key detail: on GitHub Pages your site is served under `/lepupitre/`, so Astro must build with that base path.

```js
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://esandorfi.github.io",
  base: "/lepupitre",
  output: "static"
});
```

Astro’s default build output directory is `dist/` (we’ll deploy that). ([docs.astro.build][2])

---

## 4) A tiny layout (so Markdown pages look consistent)

### `website/src/layouts/Base.astro`

```astro
---
const { title = "Le Pupitre" } = Astro.props;
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>{title}</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; }
      main { max-width: 860px; margin: 0 auto; padding: 32px 16px; }
      nav a { margin-right: 12px; }
      .card { border: 1px solid #ddd; border-radius: 12px; padding: 16px; }
      .btn { display: inline-block; padding: 10px 14px; border: 1px solid #111; border-radius: 10px; text-decoration: none; }
      .muted { opacity: 0.8; }
    </style>
  </head>
  <body>
    <main>
      <nav class="muted">
        <a href={`${Astro.site?.pathname ?? ""}${import.meta.env.BASE_URL}`}>Home</a>
        <a href={`${import.meta.env.BASE_URL}downloads/`}>Downloads</a>
        <a href="https://github.com/esandorfi/lepupitre">GitHub</a>
      </nav>
      <hr />
      <slot />
    </main>
  </body>
</html>
```

---

## 5) Two human-editable Markdown pages

### `website/src/pages/index.md`

```md
---
layout: ../layouts/Base.astro
title: Le Pupitre
---

# Le Pupitre

A short description you can edit anytime.

<div class="card">

- Get the app: **[Downloads](./downloads/)**  
- Source code: GitHub repo

</div>
```

### `website/src/pages/downloads.md`

```md
---
layout: ../layouts/Base.astro
title: Downloads
---

# Downloads

This page is generated automatically from the **latest GitHub Release** assets.

<div id="downloads" class="card">
Loading latest release…
</div>

<script src="../downloads.js"></script>

---

## Notes

You can edit this text in Markdown whenever you want.
```

---

## 6) Runtime script to render download buttons

Put this in `website/public/downloads.js`
(Everything in `public/` is served “as-is” by Astro. ([docs.astro.build][3]))

```js
(async function () {
  const owner = "esandorfi";
  const repo = "lepupitre";
  const el = document.getElementById("downloads");
  const api = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  function classify(name) {
    const n = name.toLowerCase();
    if (n.endsWith(".dmg")) return "macOS";
    if (n.endsWith(".msi") || n.endsWith(".exe")) return "Windows";
    if (n.endsWith(".appimage") || n.endsWith(".deb") || n.endsWith(".rpm")) return "Linux";
    return null;
  }

  function escapeHtml(s) {
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  try {
    const res = await fetch(api, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
    const release = await res.json();

    const version = release.tag_name || release.name || "latest";
    const assets = (release.assets || [])
      .map(a => ({ name: a.name, url: a.browser_download_url, os: classify(a.name) }))
      .filter(a => a.os);

    if (!assets.length) {
      el.innerHTML = `
        <p><strong>Latest:</strong> ${escapeHtml(version)}</p>
        <p>No downloadable assets found in the latest GitHub Release.</p>
        <p><a class="btn" href="${release.html_url}">Open release on GitHub</a></p>
      `;
      return;
    }

    const groups = Object.groupBy(assets, a => a.os);
    let html = `<p><strong>Latest:</strong> ${escapeHtml(version)}</p>`;
    html += `<p><a class="btn" href="${release.html_url}">Release notes</a></p>`;
    html += `<hr/>`;

    for (const os of ["macOS", "Windows", "Linux"]) {
      if (!groups[os]) continue;
      html += `<h2>${os}</h2>`;
      for (const a of groups[os]) {
        html += `<p><a class="btn" href="${a.url}">Download ${escapeHtml(a.name)}</a></p>`;
      }
    }

    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = `
      <p><strong>Could not load downloads automatically.</strong></p>
      <p class="muted">${escapeHtml(String(e))}</p>
      <p><a class="btn" href="https://github.com/${owner}/${repo}/releases">See all releases</a></p>
    `;
  }
})();
```

This uses GitHub’s releases endpoint + `browser_download_url` to link release assets. ([docs.astro.build][1])

---

## 7) GitHub Actions: deploy Astro to GitHub Pages

Create: `.github/workflows/pages.yml`

This is the standard Pages pipeline: build → upload artifact → deploy. ([GitHub Docs][4])

```yml
name: Deploy website to GitHub Pages

on:
  push:
    branches: ["main"]
    paths:
      - "website/**"
      - ".github/workflows/pages.yml"
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: website
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: website/package-lock.json

      - name: Install
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: website/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

### One-time GitHub setting

Repo → **Settings → Pages → Source = GitHub Actions**. ([docs.astro.build][1])

---

## 8) Optional: Release CI (so downloads are “real”)

Your downloads page only shows buttons if you publish assets in **GitHub Releases**. The clean pattern is:

* Push a tag `vX.Y.Z`
* Workflow builds your desktop app installers
* Workflow creates/updates the Release and uploads assets
* Downloads page instantly lists them

If your desktop build is Tauri, use `tauri-apps/tauri-action` (common standard). If you confirm your desktop folder path (`desktop/` or root), I’ll tailor this file exactly.

For now, here’s a safe template:

`.github/workflows/release.yml` (optional)

```yml
name: Build & Publish Release

on:
  push:
    tags:
      - "v*.*.*"

permissions:
  contents: write

jobs:
  release:
    strategy:
      fail-fast: false
      matrix:
        os: [macos-latest, windows-latest, ubuntu-22.04]
    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      # Adjust commands to your actual desktop build setup
      - name: Install dependencies
        run: npm ci

      # If you use Tauri, replace this section with tauri-action
      # - uses: tauri-apps/tauri-action@v0
      #   with:
      #     tagName: ${{ github.ref_name }}
      #     releaseName: "Le Pupitre ${{ github.ref_name }}"
```

---

## Editing content day-to-day

You’ll edit only:

* `website/src/pages/index.md`
* `website/src/pages/downloads.md`

…and push to `main`. GitHub Actions redeploys automatically. ([docs.astro.build][1])

---

If you paste your repo’s top-level folders (or tell me where the desktop app build lives), I’ll give you a **fully working `release.yml`** (Tauri/whatever you use) that uploads `.dmg/.msi/.deb/...` so the downloads page looks like GitButler on day 1.

[1]: https://docs.astro.build/en/guides/deploy/github/?utm_source=chatgpt.com "Deploy your Astro Site to GitHub Pages | Docs"
[2]: https://docs.astro.build/en/guides/deploy/?utm_source=chatgpt.com "Deploy your Astro Site | Docs"
[3]: https://docs.astro.build/en/reference/configuration-reference/?utm_source=chatgpt.com "Configuration Reference - Astro Docs"
[4]: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages?utm_source=chatgpt.com "Using custom workflows with GitHub Pages"
