## Option A — Flow chart (Mermaid)

> Paste this into a Markdown file that supports Mermaid (GitHub, many wiki tools, etc.)

```mermaid
flowchart TD
  A([Start: Need a document viewing/conversion approach]) --> B{Must be in-browser\n(no downloads)?}

  %% In-browser viewing path
  B -- Yes --> C{Can documents\nlive in M365 storage?\n(SharePoint/OneDrive)}
  B -- No --> Z[Conversion-only is acceptable:\nPick best converter based on fidelity/cost/approvals]

  %% M365 storage gate
  C -- No --> D[No M365 storage allowed:\nUse PDF conversion service and serve PDFs from your system]
  C -- Yes --> C1{Compliance allows data\nin M365 (even temporarily)?}
  C1 -- No --> D
  C1 -- Yes --> C2{Cloud tenant/app setup\nis feasible?}
  C2 -- No --> D
  C2 -- Yes --> C3{Embedding/preview allowed?\n(CSP/iframe/cross-domain)}
  C3 -- No --> D
  C3 -- Yes --> E{Users authenticate\nwith M365 identities?}

  %% Preview selection
  E -- Yes --> F[Best UX: M365 Preview/Embed\n(SharePoint or OneDrive preview)]
  E -- No --> G[Preview still possible but harder:\nexpect auth/embedding friction;\nconsider conversion-to-PDF instead]

  %% Conversion branch
  D --> H{Need cloud conversion\nvia Graph acceptable?\n(upload→convert→download)}
  H -- No --> I{No Office binaries on\nweb/app server?}
  H -- Yes --> H1{App registration in Entra allowed?}
  H1 -- No --> I
  H1 -- Yes --> H2{Graph permissions approvable?\n(Sites/Files scopes)}
  H2 -- No --> I
  H2 -- Yes --> H3{Staging uploads into\nSP/OD acceptable?}
  H3 -- No --> I
  H3 -- Yes --> J[Choose: MS Graph Convert\n(Cloud conversion path)]

  %% Local conversion options
  I -- Yes --> K{Docker/containers allowed?}
  I -- No --> L{High-fidelity rendering critical?}

  K -- Yes --> M[Choose: LibreOffice headless\n(container microservice)]
  K -- No --> N[Choose: Aspose in-process\n(no Office install on server)]

  L -- Yes --> N
  L -- No --> O{Minimize licensing cost?}
  O -- Yes --> P[Choose: LibreOffice headless\n(or OpenOffice only if forced)]
  O -- No --> N

  %% Notes / final output
  F --> Q([Outcome: SharePoint/OneDrive Preview])
  J --> R([Outcome: MS Graph Convert])
  M --> S([Outcome: LibreOffice Convert Service])
  N --> T([Outcome: Aspose Convert])
  P --> S
  G --> D
  Z --> I
```

---

## Option B — Boss outline (10 questions → pick a lane)

This is basically the same logic, but in “exec checklist” form.

### 1) What’s the primary goal?

* **A. In-browser viewing (no downloads)** → go to section 2
* **B. “Just get me a PDF reliably”** → go to section 3

---

### 2) If the goal is *in-browser viewing*

**2.1** Can documents be stored or staged in **SharePoint/OneDrive**?

* If **No** → M365 preview is off the table → go to section 3 (conversion + your own viewer)
* If **Yes** → continue

**2.2** Is it allowed for data to reside in M365 **even temporarily** (compliance)?

* If **No** → go to section 3
* If **Yes** → continue

**2.3** Is cloud tenant/app setup feasible (**cloud infra approvals exist**)?

* If **No** → go to section 3
* If **Yes** → continue

**2.4** Is **embedding/preview allowed** (CSP/iframe/cross-domain)?

* If **No** → go to section 3 (convert to PDF and view in your app)
* If **Yes** → **Recommendation: SharePoint/OneDrive Preview/Embed**

  * Best UX when docs live in M365
  * Especially strong if users already authenticate with M365 identities

---

### 3) If the goal is *conversion to PDF* (or preview gates failed)

**3.1** Is **cloud conversion via Graph** acceptable? (upload → convert → download)

* If **Yes**, then the minimum gates are:

  * **Entra app registration allowed**
  * **Graph permissions approvable** (Sites/Files scopes)
  * **Staging uploads acceptable**
  * **M365 data allowed** (compliance)
  * If all true → **Recommendation: MS Graph Convert**
* If **No** (or gates fail) → continue

**3.2** Are **Office binaries not allowed on the web/app server**?

* If **Yes**, you need either:

  * **Aspose (in-process)** (no Office install), OR
  * **LibreOffice in Docker** (Office isolated in a container)
* If **No**, you can consider LibreOffice/OpenOffice installed — but that’s usually where security concern shows up.

**3.3** Are **containers (Docker) allowed**?

* If **Yes** → **Recommendation: LibreOffice headless as a conversion microservice**
* If **No** → **Recommendation: Aspose in-process**

**3.4** Is **high-fidelity rendering** critical?

* If **Yes** → **Aspose wins**
* If **No**, and **low cost** matters → **LibreOffice wins** (OpenOffice only if forced; it’s typically the “last resort”)

---

## Quick “lane summary” (what you’re really asking leadership to decide)

1. **Do we allow M365 storage/staging + embedding?**
   → If yes, Preview/Embed is the best browser experience.

2. **If not, do we allow Docker?**
   → If yes, LibreOffice conversion service is the practical open route.

3. **If Docker is not allowed, are we willing to buy a library?**
   → If yes, Aspose is the cleanest “no Office installs” option.

