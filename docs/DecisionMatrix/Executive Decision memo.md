Perfect. Below is a **single-page, executive-friendly decision memo** you can drop straight into a doc, email, or Confluence page.
It’s designed so leadership can read **top → bottom** and make **one or two explicit decisions** without touching the JSON.

---

# PDFolio — Document Viewing & Conversion

## Executive Decision Memo (1-Page)

### Purpose

Select a **safe, supportable, and timely** approach for document viewing and/or PDF conversion in PDFolio, balancing **user experience, approvals, security, cost, and delivery speed**.

This memo replaces a detailed technical questionnaire with a **clear decision flow**.

---

## Decision 1 — Is in-browser viewing (no downloads) required?

**If YES**, continue to Decision 2
**If NO**, skip to Decision 4 (conversion-only path)

---

## Decision 2 — Can documents be stored or staged in Microsoft 365?

Examples:

* SharePoint
* OneDrive

Includes:

* Temporary staging
* Preview artifacts
* Converted PDFs

**If NO** → M365 preview is not viable → go to Decision 4
**If YES** → continue

---

## Decision 3 — Are cloud + embedding approvals feasible?

Confirm **all** of the following:

* Cloud tenant / app registration can be approved
* Compliance allows data to reside in M365 (even temporarily)
* Embedding / preview is allowed (CSP, iframe, cross-domain)
* Network access to M365 endpoints is permitted

**If YES**
➡ **Recommended Path: M365 Preview / Embed**

* Best user experience
* Native browser preview
* Minimal custom rendering logic
* Strong fit when users authenticate with M365 identities

**If NO**
➡ Preview blocked → go to Decision 4

---

## Decision 4 — Is cloud-based PDF conversion acceptable?

(Upload → convert → download via Microsoft Graph)

Requires:

* Entra ID app registration
* Approved Graph permissions (Sites / Files)
* Staging uploads to SharePoint/OneDrive allowed

**If YES**
➡ **Recommended Path: Microsoft Graph PDF Conversion**

**If NO** → continue

---

## Decision 5 — Are Docker / containers allowed?

**If YES**
➡ **Recommended Path: LibreOffice (headless) as a containerized conversion service**

* Open source
* Low licensing cost
* Office binaries isolated from app server
* Most common enterprise OSS solution

**If NO** → continue

---

## Decision 6 — Is high-fidelity rendering critical?

Examples:

* Complex layouts
* Legal / contract formatting
* Pixel-perfect output

**If YES**
➡ **Recommended Path: Aspose (in-process)**

* No Office installation required
* Highest fidelity
* Slower procurement, but clean architecture

**If NO**
➡ **LibreOffice still preferred** (if allowed), otherwise Aspose

---

## Summary — What leadership is really deciding

| Decision                        | Outcome                            |
| ------------------------------- | ---------------------------------- |
| Allow M365 storage + embedding? | Enables best in-browser preview    |
| Allow Docker containers?        | Enables low-cost OSS conversion    |
| Willing to procure a library?   | Enables clean, non-Office installs |
| Require pixel-perfect fidelity? | Pushes decision toward Aspose      |

---

## Default Recommendation (if approvals are unclear)

> **Start with LibreOffice in a containerized conversion service**
>
> * Fastest path to production
> * Minimal procurement friction
> * Clear upgrade path to Aspose or M365 later

This keeps PDFolio moving **without locking us into an irreversible decision**.

---

If you want, next we can:

* Turn this into a **one-slide exec deck**
* Add a **“recommended path for *this* program”** call-out
* Or map each path to **rough timelines + risk levels** (weeks, not code)
