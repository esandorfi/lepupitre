(async function renderLatestRelease() {
  const owner = "esandorfi";
  const repo = "lepupitre";
  const container = document.getElementById("downloads");

  if (!container) {
    return;
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  function classifyAsset(name) {
    const normalized = name.toLowerCase();
    if (normalized.endsWith(".dmg")) return "macOS";
    if (normalized.endsWith(".msi") || normalized.endsWith(".exe")) return "Windows";
    if (
      normalized.endsWith(".appimage") ||
      normalized.endsWith(".deb") ||
      normalized.endsWith(".rpm")
    ) {
      return "Linux";
    }
    return null;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function groupByOs(assets) {
    const grouped = { macOS: [], Windows: [], Linux: [] };
    for (const asset of assets) {
      if (asset.os && grouped[asset.os]) {
        grouped[asset.os].push(asset);
      }
    }
    return grouped;
  }

  try {
    const response = await fetch(apiUrl, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) {
      throw new Error(`GitHub API error ${response.status}`);
    }

    const release = await response.json();
    const version = release.tag_name || release.name || "latest";
    const releaseUrl = release.html_url || `https://github.com/${owner}/${repo}/releases`;

    const assets = (release.assets || [])
      .map((asset) => ({
        name: asset.name,
        url: asset.browser_download_url,
        os: classifyAsset(asset.name || ""),
      }))
      .filter((asset) => asset.os);

    if (assets.length === 0) {
      container.innerHTML = `
        <p><strong>Latest:</strong> ${escapeHtml(version)}</p>
        <p>No downloadable installers were detected in this release.</p>
        <p><a class="btn" href="${escapeHtml(releaseUrl)}">Open release notes</a></p>
      `;
      return;
    }

    const grouped = groupByOs(assets);
    const order = ["macOS", "Windows", "Linux"];
    let html = `<p><strong>Latest:</strong> ${escapeHtml(version)}</p>`;
    html += `<p><a class="btn" href="${escapeHtml(releaseUrl)}">Release notes</a></p>`;

    for (const os of order) {
      if (!grouped[os].length) {
        continue;
      }
      html += `<hr /><h2>${os}</h2>`;
      for (const asset of grouped[os]) {
        html += `<p><a class="btn" href="${escapeHtml(asset.url)}">Download ${escapeHtml(asset.name)}</a></p>`;
      }
    }

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `
      <p><strong>Automatic download listing is unavailable.</strong></p>
      <p class="muted">${escapeHtml(error)}</p>
      <p><a class="btn" href="https://github.com/${owner}/${repo}/releases">Open all releases</a></p>
    `;
  }
})();
