/**
 * decision-engine.js
 * Shared logic for boss.html and expanded.html
 *
 * Required HTML ids:
 *  - requirements (container)
 *  - results (tbody)
 *  - best, second, confidence (kpi fields)
 *
 * Optional:
 *  - messages (container for conflict notes)
 *  - execSummary (container to show summary preview)
 *  - copySummaryBtn (button)  OR a container with id=copySummaryHost (it will inject button)
 *
 * Body attributes:
 *  - data-view="boss|expanded"
 *  - data-data-url="./decision-data.json"
 *  - data-show-why="true|false"
 */

(async function () {
  const dataUrl = document.body.getAttribute("data-data-url") || "./decision-data.json";
  const view = document.body.getAttribute("data-view") || "boss";
  const showWhy = document.body.getAttribute("data-show-why") === "true";

  const res = await fetch(dataUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${dataUrl}: ${res.status}`);
  const data = await res.json();

  const minScore = data.meta?.scoreRange?.min ?? 0;
  const maxScore = data.meta?.scoreRange?.max ?? 100;
  const baseScore = data.meta?.baseScore ?? 50;

  const reqHost = document.getElementById("requirements");
  const resultsBody = document.getElementById("results");
  const messagesHost = document.getElementById("messages");
  const execSummaryHost = document.getElementById("execSummary");

  // Ensure we have a copy button on both pages
  ensureCopyButton();

  // Track selected requirements
  const selected = new Set(); // requirement ids

  // Render requirements
  reqHost.innerHTML = (data.requirements ?? []).map(r => {
    const hint = (view === "expanded" && r.hint) ? `<div class="hint">${escapeHtml(r.hint)}</div>` : "";
    return `
      <div class="row">
        <input type="checkbox" id="req_${escapeAttr(r.id)}" data-req="${escapeAttr(r.id)}">
        <label for="req_${escapeAttr(r.id)}">
          <b>${escapeHtml(r.label)}</b>
          ${hint}
        </label>
      </div>
    `;
  }).join("");

  // Listen for change -> rescore immediately
  reqHost.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      const id = cb.getAttribute("data-req");
      if (!id) return;
      if (cb.checked) selected.add(id);
      else selected.delete(id);
      scoreAndRender();
    });
  });

  // Initial render (nothing checked)
  scoreAndRender();

  // -------------------------
  // Scoring + rendering
  // -------------------------
  function scoreAndRender() {
    // Base score for all options
    const scores = {};
    const reasons = {};
    for (const opt of data.options ?? []) {
      scores[opt.key] = baseScore;
      reasons[opt.key] = (view === "expanded" ? (opt.notes ?? []) : []);
    }

    // Apply weights for each selected requirement
    for (const w of (data.weights ?? [])) {
      if (!selected.has(w.requirementId)) continue;

      for (const [optKey, delta] of Object.entries(w.effects ?? {})) {
        if (scores[optKey] == null) continue;
        const d = Number(delta) || 0;
        scores[optKey] += d;

        if (view === "expanded") {
          reasons[optKey].push(`+ ${w.requirementId} (${d > 0 ? "+" : ""}${d})`);
        }
      }
    }

    // Apply rules (supporting requirements/conflicts)
    const messages = [];
    const triggeredRules = [];

    for (const rule of (data.rules ?? [])) {
      if (rule.type !== "penaltyIf") continue;

      const allSelected = (rule.whenAllSelected ?? []).every(id => selected.has(id));
      const noneSelected = (rule.whenNoneSelected ?? []).every(id => !selected.has(id));

      if (allSelected && noneSelected) {
        triggeredRules.push(rule);

        for (const [optKey, delta] of Object.entries(rule.penalties ?? {})) {
          if (scores[optKey] == null) continue;
          const d = Number(delta) || 0;
          scores[optKey] += d;

          if (view === "expanded") {
            reasons[optKey].push(`⚠ rule:${rule.id} (${d > 0 ? "+" : ""}${d})`);
          }
        }
        if (rule.message) messages.push(rule.message);
      }
    }

    // Clamp + sort rows
    const rows = (data.options ?? [])
      .map(o => {
        const raw = scores[o.key] ?? baseScore;
        const clamped = clamp(raw, minScore, maxScore);
        return { key: o.key, name: o.name, group: o.group, score: clamped, why: reasons[o.key] ?? [] };
      })
      .sort((a, b) => b.score - a.score);

    renderKpis(rows);
    renderTable(rows);
    renderMessages(messages);

    // confidence based on score gap
    const best = rows[0], second = rows[1];
    const delta = Math.abs((best?.score ?? 0) - (second?.score ?? 0));
    let conf = "High";
    if (delta < 6) conf = "Medium";
    if (delta < 3) conf = "Low";
    setText("confidence", conf);

    // Build and show exec summary preview
    const summary = buildExecSummary({
      rows, conf, messages, triggeredRules,
      selectedReqIds: Array.from(selected)
    });

    if (execSummaryHost) {
      execSummaryHost.textContent = summary;
    }

    // Store it for copy button
    window.__PDFOLIO_DECISION_SUMMARY__ = summary;
  }

  // -------------------------
  // Exec Summary Builder
  // -------------------------
  function buildExecSummary(ctx) {
    const header = data.meta?.execSummary?.header ?? "Executive Summary";
    const bulletPrefix = data.meta?.execSummary?.bulletPrefix ?? "- ";

    const top = ctx.rows[0];
    const second = ctx.rows[1];

    const selectedLabels = ctx.selectedReqIds.map(id => {
      return (
        data.friendlyRequirementNames?.[id] ||
        (data.requirements ?? []).find(r => r.id === id)?.label ||
        id
      );
    });

    // Optional: compute "top drivers" for top option (based on selected requirements’ deltas)
    const drivers = topDriversFor(top?.key, ctx.selectedReqIds).slice(0, 3);

    const lines = [];
    lines.push(header);
    lines.push("");

    if (!ctx.selectedReqIds.length) {
      lines.push(`${bulletPrefix}No requirements selected yet (results are baseline).`);
    } else {
      lines.push(`${bulletPrefix}Selected requirements (${ctx.selectedReqIds.length}): ${selectedLabels.join("; ")}`);
    }

    if (top) {
      const driverText = drivers.length ? ` Top drivers: ${drivers.join("; ")}.` : "";
      lines.push(`${bulletPrefix}Top recommendation: ${top.name} (Score ${top.score}).${driverText}`);
    } else {
      lines.push(`${bulletPrefix}Top recommendation: —`);
    }

    if (second) {
      lines.push(`${bulletPrefix}Runner-up: ${second.name} (Score ${second.score}).`);
    }

    lines.push(`${bulletPrefix}Confidence: ${ctx.conf}.`);

    if (ctx.messages?.length) {
      lines.push(`${bulletPrefix}Notes / blockers: ${ctx.messages.join(" | ")}`);
    }

    // “Next step” suggestion (simple and safe)
    if (top?.key === "aspose") {
      lines.push(`${bulletPrefix}Next step: confirm licensing/procurement timeline and validate conversion fidelity on sample docs.`);
    } else if (top?.key === "libreoffice" || top?.key === "openoffice") {
      lines.push(`${bulletPrefix}Next step: validate container approval + run a conversion POC using representative documents.`);
    } else if (top?.key === "msgraph_convert") {
      lines.push(`${bulletPrefix}Next step: confirm tenant/app-permission feasibility and test upload→convert→download flow on sample docs.`);
    } else if (top?.group === "preview") {
      lines.push(`${bulletPrefix}Next step: confirm storage/identity approach and test iframe preview experience with typical users.`);
    }

    return lines.join("\n");
  }

  function topDriversFor(optionKey, selectedReqIds) {
    if (!optionKey) return [];
    const out = [];

    for (const w of (data.weights ?? [])) {
      if (!selectedReqIds.includes(w.requirementId)) continue;
      const delta = Number(w.effects?.[optionKey] ?? 0);
      if (!delta) continue;

      const label =
        data.friendlyRequirementNames?.[w.requirementId] ||
        (data.requirements ?? []).find(r => r.id === w.requirementId)?.label ||
        w.requirementId;

      out.push({ label, delta });
    }

    // Sort by absolute impact, descending
    out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return out.map(d => `${d.label} (${d.delta > 0 ? "+" : ""}${d.delta})`);
  }

  // -------------------------
  // Rendering helpers
  // -------------------------
  function renderKpis(rows) {
    setText("best", rows[0]?.name ?? "—");
    setText("second", rows[1]?.name ?? "—");
  }

  function renderTable(rows) {
    resultsBody.innerHTML = "";
    rows.forEach((r, idx) => {
      const tr = document.createElement("tr");
      if (idx === 0) tr.classList.add("rank1");

      const tdName = document.createElement("td");
      tdName.textContent = r.name;

      const tdScore = document.createElement("td");
      tdScore.className = "score";
      tdScore.textContent = String(r.score);

      tr.appendChild(tdName);
      tr.appendChild(tdScore);

      if (showWhy) {
        const tdWhy = document.createElement("td");
        tdWhy.className = "why";
        tdWhy.innerHTML = r.why.length
          ? `<ul style="margin:0;padding-left:18px;">${r.why.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`
          : `<span class="small">No specific drivers selected yet.</span>`;
        tr.appendChild(tdWhy);
      }

      resultsBody.appendChild(tr);
    });
  }

  function renderMessages(msgs) {
    if (!messagesHost) return;
    if (!msgs?.length) {
      messagesHost.innerHTML = "";
      return;
    }
    messagesHost.innerHTML = `
      <div class="msgTitle"><b>Notes / Conflicts detected</b></div>
      <ul>${msgs.map(m => `<li>${escapeHtml(m)}</li>`).join("")}</ul>
    `;
  }

  // -------------------------
  // Copy button wiring
  // -------------------------
  function ensureCopyButton() {
    // If the page already has a button, use it. Otherwise inject one if host exists.
    let btn = document.getElementById("copySummaryBtn");

    const host = document.getElementById("copySummaryHost");
    if (!btn && host) {
      host.innerHTML = `<button id="copySummaryBtn" type="button">Copy Executive Summary</button>
                        <span id="copyStatus" style="margin-left:10px; color:#a9b5d1; font-size:12px;"></span>`;
      btn = document.getElementById("copySummaryBtn");
    }

    if (!btn) return;

    btn.addEventListener("click", async () => {
      const text = window.__PDFOLIO_DECISION_SUMMARY__ || "No summary available yet.";
      try {
        await navigator.clipboard.writeText(text);
        setCopyStatus("Copied.");
      } catch {
        // fallback for restrictive browsers
        fallbackCopy(text);
      }
    });

    function setCopyStatus(msg) {
      const el = document.getElementById("copyStatus");
      if (!el) return;
      el.textContent = msg;
      setTimeout(() => (el.textContent = ""), 2000);
    }

    function fallbackCopy(text) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        setCopyStatus("Copied.");
      } catch {
        setCopyStatus("Copy failed. Select text manually.");
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  // -------------------------
  // Utils
  // -------------------------
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function escapeAttr(s) {
    return String(s).replaceAll('"', "");
  }
})();
