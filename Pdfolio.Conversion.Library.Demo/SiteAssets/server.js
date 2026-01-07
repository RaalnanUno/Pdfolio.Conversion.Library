// Demo-only API: reads SQLite and returns FileArchive rows as JSON.
// Run with: npm run api
// Optional override: set PDFOLIO_DB="full\\path\\to\\PdfolioBackup.db"

const path = require("path");
const fs = require("fs");
const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");

const app = express();
app.use(cors()); // demo-only: allow live-server origin

function resolveDbPath() {
  // 1) explicit override wins
  const env = process.env.PDFOLIO_DB;
  if (env && env.trim()) {
    const p = path.resolve(env.trim());
    if (!fs.existsSync(p)) throw new Error(`PDFOLIO_DB was set but file not found: ${p}`);
    return p;
  }

  // 2) default: relative to repo root (assumes you run from demo folder)
  // DB created by dotnet run typically ends up under:
  //   Pdfolio.Conversion.Library.Demo/bin/Debug/net8.0/Data/PdfolioBackup.db
  const rel = path.join("bin", "Debug", "net8.0", "Data", "PdfolioBackup.db");
  const p = path.resolve(rel);

  if (!fs.existsSync(p)) {
    throw new Error(
      `Default DB not found at: ${p}\n` +
      `Run the demo converter first (dotnet run ...) or set PDFOLIO_DB to the full path.`
    );
  }

  return p;
}

const dbPath = resolveDbPath();
console.log("API CWD =", process.cwd());
console.log("API DB  =", dbPath);

// Open DB (read/write is fine for demos; we're not mutating here)
const db = new Database(dbPath, { readonly: false });

// Sanity check table exists
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
        PdfBlob,
        PdfReportJson,
        PdfErrorJson
      FROM FileArchive
      WHERE Id = ?
    `)
    .get(id);
}

function sanitizeFileName(name) {
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

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    dbPath,
    sqliteVersion: db.prepare("select sqlite_version() as v").get().v,
    fileArchiveCount: db.prepare("SELECT COUNT(*) AS n FROM FileArchive;").get().n,
    time: new Date().toISOString()
  });
});

app.get("/api/tables", (req, res) => {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
    .all()
    .map((r) => r.name);

  res.json({ dbPath, tables });
});

app.get("/api/filearchive/schema", (req, res) => {
  const cols = db.prepare("PRAGMA table_info(FileArchive);").all();
  res.json({ dbPath, cols });
});

// UI-friendly list (avoid returning blobs)
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

        IngestedUtc       AS CreatedUtc,
        FileCreatedUtc,
        FileModifiedUtc,

        PdfConvertedUtc,
        PdfStatus,
        PdfError,

        Length(OriginalBlob) AS FileBytes,
        Length(PdfBlob)      AS PdfBytes,
        Length(PdfReportJson) AS ReportBytes,
        Length(PdfErrorJson)  AS ErrorJsonBytes

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
      ...(q ? { like: `%${q}%` } : {})
    });

    res.json({ dbPath, count: rows.length, take, offset, q: qRaw, rows });
  } catch (err) {
    res.status(500).json({ error: String(err), dbPath });
  }
});

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
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(row.PdfBlob);
});

// View report JSON (pretty)
app.get("/api/filearchive/:id/report", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).send("Invalid id");

  const row = getRowById(id);
  if (!row) return res.status(404).send("Not found");
  if (!row.PdfReportJson) return res.status(404).send("PdfReportJson is null");

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const txt = Buffer.from(row.PdfReportJson).toString("utf8");
    const obj = JSON.parse(txt);
    res.send(JSON.stringify(obj, null, 2));
  } catch {
    // if it's not valid JSON for some reason, just return bytes as text
    res.send(Buffer.from(row.PdfReportJson).toString("utf8"));
  }
});

// View error JSON (pretty)
app.get("/api/filearchive/:id/error", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).send("Invalid id");

  const row = getRowById(id);
  if (!row) return res.status(404).send("Not found");
  if (!row.PdfErrorJson) return res.status(404).send("PdfErrorJson is null");

  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const txt = Buffer.from(row.PdfErrorJson).toString("utf8");
    const obj = JSON.parse(txt);
    res.send(JSON.stringify(obj, null, 2));
  } catch {
    res.send(Buffer.from(row.PdfErrorJson).toString("utf8"));
  }
});

// ---------------------------
// Start server
// ---------------------------
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5055;
app.listen(port, () => {
  console.log(`Pdfolio Demo API running on http://localhost:${port}`);
  console.log(`Try: http://localhost:${port}/api/health`);
});
