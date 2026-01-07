/* Pdfolio Demo Viewer - site.js */
/* global $, jQuery */

const API_BASE = "http://localhost:5055";

async function apiGet(path, params = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      url.searchParams.set(k, String(v));
    }
  });

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`API error ${res.status} for ${url}`);
  return res.json();
}

function fmtBytes(n) {
  if (n === null || n === undefined) return "";
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  return num.toLocaleString();
}

function esc(v) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/[&<>'"]/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[c]));
}

function buildLinks(r) {
  const origUrl = `${API_BASE}/api/filearchive/${r.Id}/original`;
  const pdfUrl  = `${API_BASE}/api/filearchive/${r.Id}/pdf`;
  const repUrl  = `${API_BASE}/api/filearchive/${r.Id}/report`;
  const errUrl  = `${API_BASE}/api/filearchive/${r.Id}/error`;

  const hasPdf = (r.PdfBytes || 0) > 0;
  const hasRep = (r.ReportBytes || 0) > 0;
  const hasErr = (r.ErrorJsonBytes || 0) > 0;

  return `
    <div class="actions">
      <a class="btn btn-sm btn-outline-primary" href="${origUrl}" target="_blank" rel="noopener">Original</a>
      <a class="btn btn-sm btn-outline-success ${hasPdf ? "" : "disabled"}" href="${hasPdf ? pdfUrl : "#"}" target="_blank" rel="noopener">PDF</a>
      <a class="btn btn-sm btn-outline-secondary ${hasRep ? "" : "disabled"}" href="${hasRep ? repUrl : "#"}" target="_blank" rel="noopener">Report</a>
      <a class="btn btn-sm btn-outline-danger ${hasErr ? "" : "disabled"}" href="${hasErr ? errUrl : "#"}" target="_blank" rel="noopener">Error</a>
    </div>
  `;
}

let table;

async function loadRows() {
  const q = $("#filter").val().trim();

  const data = await apiGet("/api/filearchive", { take: 500, q });

  $("#meta").text(`API: ${API_BASE} • DB: ${data.dbPath} • Rows shown: ${data.count}`);

  const rows = data.rows.map(r => {
    const hasPdf = (r.PdfBytes || 0) > 0;
    const statusBadge = hasPdf
      ? `<span class="badge bg-success">Yes</span>`
      : `<span class="badge badge-soft">No</span>`;

    return {
      Id: r.Id,
      FileName: r.FileName || "",
      Extension: r.Extension || "",
      ContentType: r.ContentType || "",
      SizeBytes: r.SizeBytes ?? "",
      FileBytes: r.FileBytes ?? "",
      PdfBytes: r.PdfBytes ?? "",
      ReportBytes: r.ReportBytes ?? "",
      Pdf: statusBadge,
      CreatedUtc: r.CreatedUtc || "",
      PdfStatus: r.PdfStatus ?? "",
      PdfError: r.PdfError || "",
      Download: buildLinks(r)
    };
  });

  if (!table) {
    table = $("#grid").DataTable({
      data: rows,
      columns: [
        { data: "Id" },
        { data: "FileName" },
        { data: "Extension" },
        { data: "ContentType" },
        { data: "SizeBytes", render: fmtBytes },
        { data: "FileBytes", render: fmtBytes },
        { data: "PdfBytes", render: fmtBytes },
        { data: "ReportBytes", render: fmtBytes },
        { data: "Pdf" },
        { data: "CreatedUtc", className: "mono" },
        { data: "PdfStatus" },
        { data: "PdfError", render: (v) => `<span class="small-muted">${esc(v)}</span>` },
        { data: "Download", orderable: false, searchable: false }
      ],
      order: [[0, "desc"]],
      pageLength: 25,
      lengthMenu: [10, 25, 50, 100, 250],
      autoWidth: false,
      responsive: true
    });
  } else {
    table.clear();
    table.rows.add(rows);
    table.draw();
  }
}

async function loadHealth() {
  const h = await apiGet("/api/health");
  $("#health").text(`Health: ok • SQLite: ${h.sqliteVersion} • Total Rows: ${h.fileArchiveCount}`);
}

async function init() {
  try {
    await loadHealth();
    await loadRows();
  } catch (e) {
    $("#meta").text(`Error: ${e.message}`);
  }

  $("#refresh").on("click", async () => {
    try { await loadHealth(); await loadRows(); } catch (e) { $("#meta").text(`Error: ${e.message}`); }
  });

  let typing;
  $("#filter").on("input", () => {
    clearTimeout(typing);
    typing = setTimeout(() => loadRows().catch(e => $("#meta").text(`Error: ${e.message}`)), 250);
  });
}

$(init);
