# PDFolio — Document Viewing Decision Matrix (Expanded)

Purpose: Choose the best approach for **in-browser viewing** of Office documents in a **non-SharePoint website** (so users don’t have to download files).  
Instructions: **Check the boxes** that match leadership priorities. Use the scoring guide to identify the best-fit option(s).

---

## Options under consideration

- **OpenOffice (Headless Convert)**
- **LibreOffice (Headless Convert)**
- **Aspose (In-Process Convert)**
- **MS Graph (Convert to PDF)**
- **SharePoint (Preview / Embed)**
- **OneDrive (Preview / Embed)**

---

## Priority quiz (checkboxes)

### Delivery & approvals
- [ ] **Fastest path to production**
- [ ] **Minimize security / procurement approvals**
- [ ] **Minimize new account / infrastructure setup** (example: “Kubernetes account was too difficult” → similar risk for cloud/tenant work)

### Security & hosting posture
- [ ] **No Office binaries installed on the web/app server**
- [ ] **Docker / containers are allowed** (enables isolated LO/OO conversion service)
- [ ] **Cloud account + infrastructure setup is feasible** (tenant/app registration/permissions, governance, etc.)

### Microsoft 365 alignment
- [ ] **Microsoft 365 storage is acceptable** (SharePoint/OneDrive staging or storage)
- [ ] **Users authenticate with Microsoft 365 identities** (SSO, CAC/PIV-backed AAD, etc.)

### User experience
- [ ] **In-browser viewing without downloads** (primary requirement)

### Quality & cost
- [ ] **High-fidelity rendering matters** (complex templates, fonts, exact layout)
- [ ] **Minimize licensing cost**
- [ ] **Document signing is required** (may change best path)

---

## How to interpret results

### Rule of thumb
- If **M365 storage + identities are OK**, **Preview/Embed** (SharePoint/OneDrive) is often the cleanest “view in browser” experience.
- If **M365 isn’t OK**, you’ll need **conversion** (Docker LO/OO or Aspose).
- If **approvals are the hardest part**, bias toward the option with the fewest org blockers—even if technically “less elegant.”

### Red flags (conflicts)
- If ✅ **No Office on server** but ❌ **Docker not allowed** → LO/OO become hard to justify.
- If ❌ **Cloud infra setup is feasible** → MS Graph / SharePoint / OneDrive paths may be blocked by org friction.
- If ❌ **M365 storage acceptable** → SharePoint/OneDrive preview and Graph conversion are effectively blocked.

---

## Scoring matrix (Expanded)

Use this as a “manual scoring” guide:
- **++ Strong match**
- **+ Good match**
- **0 Neutral**
- **– Tradeoff**
- **— Strong mismatch / likely blocker**

> Tip: If a priority is checked, treat “++” as a major advantage, “—” as a major risk.

---

## Option 1: OpenOffice (Headless Convert)

**What it is:** Runs `soffice` headless to convert docs → PDF, then your site displays PDFs.

**Best when**
- ✅ Docker/containers are allowed (**recommended** for safety/isolation)
- ✅ Cloud infra setup is not feasible
- ✅ M365 storage is not acceptable
- ✅ Licensing cost must be minimized

**Tradeoffs**
- Usually less preferred than LibreOffice (stability/modernity)
- Operational quirks; troubleshooting can be time-consuming

**Fit vs priorities**
- Fastest path: +  
- Low approvals: +  
- No Office on server: **++ (only if containerized)** / — (if installed on host)  
- Docker allowed: ++  
- Cloud infra feasible: 0  
- M365 storage acceptable: 0  
- Users have M365 identity: 0  
- No download (browser view): + (PDF viewer)  
- High fidelity: –  
- Low cost: ++  
- Signing required: 0 (conversion-only)

---

## Option 2: LibreOffice (Headless Convert)

**What it is:** Headless conversion service (often containerized) producing PDFs for browser viewing.

**Best when**
- ✅ Docker/containers are allowed
- ✅ You need to avoid cloud tenant + permissions approvals
- ✅ M365 storage is not acceptable
- ✅ You need a fast solution with fewer procurement hurdles than Aspose

**Tradeoffs**
- Fidelity can vary with complex templates/fonts
- You operate the conversion runtime (CPU/memory heavy conversions)

**Fit vs priorities**
- Fastest path: ++  
- Low approvals: ++  
- No Office on server: **++ (containerized)** / — (if installed on host)  
- Docker allowed: ++  
- Cloud infra feasible: 0  
- M365 storage acceptable: 0  
- Users have M365 identity: 0  
- No download (browser view): + (PDF viewer)  
- High fidelity: – / 0 (depends on doc complexity)  
- Low cost: ++  
- Signing required: 0 (conversion-only)

---

## Option 3: Aspose (In-Process Convert)

**What it is:** Commercial libraries convert Office formats to PDF in-process (no LO/OO binaries).

**Best when**
- ✅ High-fidelity conversion is critical
- ✅ You want no Office binaries installed on servers
- ✅ You can tolerate procurement/security approval effort

**Tradeoffs**
- Procurement, licensing, and security review can slow delivery
- Cost (not your money 😄… but still procurement reality)

**Fit vs priorities**
- Fastest path: — (often slowed by approval)  
- Low approvals: —  
- No Office on server: ++  
- Docker allowed: 0 (optional)  
- Cloud infra feasible: 0  
- M365 storage acceptable: 0  
- Users have M365 identity: 0  
- No download (browser view): + (PDF viewer)  
- High fidelity: ++  
- Low cost: —  
- Signing required: + (good PDF generation for downstream signing tools)

---

## Option 4: MS Graph (Convert to PDF)

**What it is:** Upload/stage Office file to OneDrive/SharePoint, then download as PDF via Graph.

**Best when**
- ✅ Cloud account + infrastructure setup is feasible
- ✅ M365 storage is acceptable (at least for staging)
- ✅ You want no Office binaries on servers
- ✅ Fidelity matters and you want Microsoft’s rendering pipeline

**Tradeoffs**
- Requires tenant/app registration + permissions reviews
- Requires upload/stage/delete or lifecycle design
- Organizational “setup friction” can be the real blocker (like the Kubernetes story)

**Fit vs priorities**
- Fastest path: – (depends on org approvals)  
- Low approvals: – / —  
- No Office on server: ++  
- Docker allowed: 0  
- Cloud infra feasible: **++ (required)** / — (if not feasible)  
- M365 storage acceptable: **++ (required)** / — (if not acceptable)  
- Users have M365 identity: + (often helpful)  
- No download (browser view): + (serve PDF in browser)  
- High fidelity: ++  
- Low cost: 0 / – (depends on licensing posture)  
- Signing required: + (PDF for downstream signing)

---

## Option 5: SharePoint (Preview / Embed)

**What it is:** Store (or stage) docs in SharePoint and embed preview in your app via iframe/preview links.

**Best when**
- ✅ You primarily need **viewing** (not PDF artifacts)
- ✅ M365 storage is acceptable
- ✅ Users authenticate with M365 identities
- ✅ You want “Office-like” browser viewing UX

**Tradeoffs**
- Storage/identity alignment is required
- “Non-SharePoint website” still depends on M365 access rules
- Preview URLs can be short-lived depending on approach

**Fit vs priorities**
- Fastest path: – (depends on M365 governance)  
- Low approvals: –  
- No Office on server: ++  
- Docker allowed: 0  
- Cloud infra feasible: **++ (required)** / —  
- M365 storage acceptable: **++ (required)** / —  
- Users have M365 identity: **++ (strongly preferred)** / —  
- No download (browser view): ++ (best UX)  
- High fidelity: ++  
- Low cost: 0 / –  
- Signing required: ++ (often aligns with M365 workflows)

---

## Option 6: OneDrive (Preview / Embed)

**What it is:** Store/stage docs in OneDrive and embed preview in your app.

**Best when**
- ✅ Similar to SharePoint preview, but with OneDrive storage model
- ✅ M365 storage + identities are acceptable
- ✅ You want the “view in browser” experience without conversion

**Tradeoffs**
- Same general governance/identity constraints
- Storage lifecycle needs to be designed (personal vs service accounts)

**Fit vs priorities**
- Fastest path: –  
- Low approvals: –  
- No Office on server: ++  
- Docker allowed: 0  
- Cloud infra feasible: **++ (required)** / —  
- M365 storage acceptable: **++ (required)** / —  
- Users have M365 identity: **++ (strongly preferred)** / —  
- No download (browser view): ++  
- High fidelity: ++  
- Low cost: 0 / –  
- Signing required: ++ (often aligns with M365 workflows)

---

## Quick recommendation patterns (what usually wins)

### Pattern A: “We can’t get cloud accounts/permissions approved quickly”
✅ Check: Min approvals, Min new infra setup  
➡️ Best fit: **LibreOffice (container)**  
Backup: **Aspose** (if fidelity is critical and approvals are doable)

### Pattern B: “Docker is allowed, but we don’t want M365 dependencies”
✅ Check: Docker allowed, No Office on server, No downloads  
➡️ Best fit: **LibreOffice (container)**  
Backup: **OpenOffice (container)** (only if LO unavailable)

### Pattern C: “We can use M365 storage and identities”
✅ Check: Cloud infra feasible, M365 storage OK, Users have M365 identities, No downloads  
➡️ Best fit: **SharePoint or OneDrive Preview** (best viewing UX)  
Backup: **MS Graph convert** (if you still want PDFs)

### Pattern D: “Fidelity is king and we’ll pay”
✅ Check: High fidelity, No Office on server  
➡️ Best fit: **Aspose**  
Backup: **MS Graph convert** (if M365 staging is acceptable)

---

## What leadership should decide (in plain language)

1) **Are we okay using Microsoft 365 storage (SharePoint/OneDrive) for these documents (even temporarily)?**  
2) **Can we realistically get cloud tenant/app-permissions approved in time?**  
3) **Are containers (Docker) an approved path here?**  
4) **Is fidelity more important than approvals speed?**

Once those are answered, the “best option” usually becomes obvious.
