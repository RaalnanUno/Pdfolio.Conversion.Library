Let's one more win before the end of the night.

Within the demo project: `Pdfolio.Conversion.Library.Demo`

I have added some files that I made use of to view the db. We'll need to update the references.

## Pdfolio.Conversion.Library.Demo\package.json

```json
{
  "name": "filearchivedemo-viewer",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "api": "node server.js",
    "web": "live-server --port=5500 --no-browser",
    "demo": "concurrently -n API,WEB \"npm run api\" \"npm run web\""
  },
  "dependencies": {
    "better-sqlite3": "^11.0.0",
    "cors": "^2.8.5",
    "express": "^4.19.2"
  },
  "devDependencies": {
    "concurrently": "^9.0.0",
    "live-server": "^1.2.2"
  }
}

```

## Pdfolio.Conversion.Library.Demo\SiteAssets\server.js

```js
// server.js
// Demo-only API: reads SQLite and returns FileArchive rows as JSON.
// Run with: node server.js
// Optional override: set FILEARCHIVE_DB="full\path\to\FileArchiveDemo.db"

const path = require("path");
const fs = require("fs");
const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");

const app = express();
app.use(cors()); // demo only: allow live-server origin

function resolveDbPath() {
  // 1) explicit override wins (most reliable for demos)
  const env = process.env.FILEARCHIVE_DB;
  if (env && env.trim()) {
    const p = path.resolve(env.trim());
    if (!fs.existsSync(p)) throw new Error(`FILEARCHIVE_DB was set but file not found: ${p}`);
    return p;
  }

  // 2) default for your repo layout (you are running from FileArchiveDemo\FileArchiveDemo)
  const rel = path.join("bin", "Debug", "net8.0", "Data", "FileArchiveDemo.db");
  const p = path.resolve(rel);

  if (!fs.existsSync(p)) {
    throw new Error(
      `Default DB not found at: ${p}\n` +
      `Run the console app first, or set FILEARCHIVE_DB to the full path.`
    );
  }

  return p;
}

const dbPath = resolveDbPath();
console.log("API CWD =", process.cwd());
console.log("API DB  =", dbPath);

// Open DB (read/write is fine for demos; we're not mutating here)
const db = new Database(dbPath, { readonly: false });

// Basic sanity check (will throw if table missing)
const countRow = db.prepare("SELECT COUNT(*) AS n FROM FileArchive;").get();
console.log("Rows in FileArchive =", countRow.n);

function getRowById(id) {
  return db
    .prepare(`
      SELECT
        Id,
        OriginalFileName,
        OriginalExtension,
        ContentType,
        OriginalBlob,
        PdfBlob
      FROM FileArchive
      WHERE Id = ?
    `)
    .get(id);
}

function sanitizeFileName(name) {
  // demo-only: remove path separators and control chars
  return String(name || "download")
    .replace(/[\\\/:*?"<>|\x00-\x1F]/g, "_")
    .trim();
}

function stripExtension(fileName) {
  return String(fileName || "file").replace(/\.[^.]+$/, "");
}

// ---------------------------
// Routes
// ---------------------------

// Health / info endpoint
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    dbPath,
    sqliteVersion: db.prepare("select sqlite_version() as v").get().v,
    fileArchiveCount: db.prepare("SELECT COUNT(*) AS n FROM FileArchive;").get().n,
    time: new Date().toISOString(),
  });
});

// List tables
app.get("/api/tables", (req, res) => {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    .all()
    .map((r) => r.name);

  res.json({ dbPath, tables });
});

// Show FileArchive schema (handy for debugging/demo)
app.get("/api/filearchive/schema", (req, res) => {
  const cols = db.prepare("PRAGMA table_info(FileArchive);").all();
  res.json({ dbPath, cols });
});

// FileArchive rows (UI-friendly aliases + avoids returning BLOBs)
app.get("/api/filearchive", (req, res) => {
  try {
    const take = Math.min(parseInt(req.query.take || "200", 10) || 200, 1000);
    const offset = Math.max(parseInt(req.query.offset || "0", 10) || 0, 0);
    const qRaw = String(req.query.q || "").trim();
    const q = qRaw.toLowerCase();

    const sql = `
      SELECT
        Id,

        OriginalFileName  AS FileName,
        OriginalExtension AS Extension,
        ContentType,

        FileSizeBytes     AS SizeBytes,

        -- For demos, show a reliable timestamp:
        IngestedUtc       AS CreatedUtc,

        -- Keep original timestamps too
        FileCreatedUtc,
        FileModifiedUtc,

        PdfConvertedUtc,
        PdfStatus,
        PdfError,

        -- Byte lengths instead of returning blobs
        Length(OriginalBlob) AS FileBytes,
        Length(PdfBlob)      AS PdfBytes

      FROM FileArchive
      ${q ? `
        WHERE
          lower(OriginalFileName) LIKE @like
          OR lower(coalesce(OriginalExtension,'')) LIKE @like
          OR lower(coalesce(ContentType,'')) LIKE @like
          OR lower(coalesce(OriginalFullPath,'')) LIKE @like
      ` : ""}
      ORDER BY Id DESC
      LIMIT @take OFFSET @offset;
    `;

    const rows = db.prepare(sql).all({
      take,
      offset,
      ...(q ? { like: `%${q}%` } : {}),
    });

    res.json({
      dbPath,
      count: rows.length,
      take,
      offset,
      q: qRaw,
      rows,
    });
  } catch (err) {
    res.status(500).json({ error: String(err), dbPath });
  }
});

// ---------------------------
// Download endpoints
// ---------------------------

// Download original file
app.get("/api/filearchive/:id/original", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).send("Invalid id");

  const row = getRowById(id);
  if (!row) return res.status(404).send("Not found");
  if (!row.OriginalBlob) return res.status(404).send("OriginalBlob is null");

  const fileName = sanitizeFileName(row.OriginalFileName || `file_${id}${row.OriginalExtension || ""}`);
  const contentType = row.ContentType || "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(row.OriginalBlob);
});

// Download PDF
app.get("/api/filearchive/:id/pdf", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).send("Invalid id");

  const row = getRowById(id);
  if (!row) return res.status(404).send("Not found");
  if (!row.PdfBlob) return res.status(404).send("PdfBlob is null");

  const base = sanitizeFileName(stripExtension(row.OriginalFileName || `file_${id}`));
  const fileName = `${base}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  // Use "attachment" to force download. Change to "inline" to open in browser.
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(row.PdfBlob);
});

// ---------------------------
// Start server
// ---------------------------
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5055;
app.listen(port, () => {
  console.log(`FileArchiveDemo API running on http://localhost:${port}`);
  console.log(`Try: http://localhost:${port}/api/health`);
});

```

## Pdfolio.Conversion.Library.Demo\SiteAssets\sqlite3.exe

For making a connection and viewing the database located at `Pdfolio.Conversion.Library.Demo\bin\Debug\net8.0\Data\PdfolioBackup.db`

## Pdfolio.Conversion.Library.Demo\SitePages\index.html

I'd love to break this out into .css and .js files. It would also be great to bring in BootStrap and JQuery and DataTables.

```html
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>FileArchiveDemo — DB Viewer</title>
  <style>
    body { font-family: system-ui, Arial, sans-serif; margin: 16px; }
    .muted { color: #666; }
    .row { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
    input { padding: 8px; width: 360px; max-width: 90vw; }
    button { padding: 6px 10px; cursor:pointer; }
    button[disabled] { cursor:not-allowed; opacity:0.5; }
    table { border-collapse: collapse; width: 100%; font-size: 14px; }
    th, td { border: 1px solid #ddd; padding: 6px 8px; vertical-align: top; }
    th { position: sticky; top: 0; background: #f6f6f6; }
    .pill { display:inline-block; padding:2px 8px; border:1px solid #ccc; border-radius:999px; }
  </style>
</head>
<body>
  <h2>FileArchiveDemo — DB Viewer</h2>

  <div class="row">
    <div class="muted" id="meta">Loading…</div>
  </div>

  <div class="row" style="margin:12px 0;">
    <input id="filter" placeholder="Filter by filename / extension / content type…" />
    <button id="refresh">Refresh</button>
  </div>

  <table>
    <thead>
      <tr>
        <th>Id</th>
        <th>FileName</th>
        <th>Ext</th>
        <th>ContentType</th>
        <th>SizeBytes</th>
        <th>FileBytes</th>
        <th>PdfBytes</th>
        <th>PDF?</th>
        <th>CreatedUtc</th>
        <th>Download</th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>

<script>
const API_BASE = "http://localhost:5055";

async function fetchRows(q) {
  const url = new URL(API_BASE + "/api/filearchive");
  url.searchParams.set("take", "300");
  if (q) url.searchParams.set("q", q);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("API error: " + res.status);
  return res.json();
}

function escapeHtml(v) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/[&<>'"]/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

function render(data) {
  const meta = document.getElementById("meta");
  meta.textContent = `API: ${API_BASE} • DB: ${data.dbPath} • Rows shown: ${data.count}`;

  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  for (const r of data.rows) {
    const hasPdf = (r.PdfBytes || 0) > 0;

    const origUrl = `${API_BASE}/api/filearchive/${r.Id}/original`;
    const pdfUrl  = `${API_BASE}/api/filearchive/${r.Id}/pdf`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.Id ?? ""}</td>
      <td>${escapeHtml(r.FileName)}</td>
      <td>${escapeHtml(r.Extension)}</td>
      <td>${escapeHtml(r.ContentType)}</td>
      <td>${r.SizeBytes ?? ""}</td>
      <td>${r.FileBytes ?? ""}</td>
      <td>${r.PdfBytes ?? ""}</td>
      <td><span class="pill">${hasPdf ? "Yes" : "No"}</span></td>
      <td>${escapeHtml(r.CreatedUtc)}</td>
      <td>
        <a href="${origUrl}" target="_blank" rel="noopener">
          <button>Original</button>
        </a>
        <a href="${hasPdf ? pdfUrl : '#'}" target="_blank" rel="noopener">
          <button ${hasPdf ? "" : "disabled"}>PDF</button>
        </a>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

async function load() {
  const q = document.getElementById("filter").value.trim();
  const data = await fetchRows(q);
  render(data);
}

document.getElementById("refresh").addEventListener("click", () => load());
document.getElementById("filter").addEventListener("input", () => load());

load().catch(err => {
  document.getElementById("meta").textContent = "Error: " + err.message;
});
</script>
</body>
</html>

```

If you have the bandwidth, I'd like to get complete files, and put the .css and .js files from the index.html in SiteAssets.