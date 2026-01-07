# Pdfolio Design Decisions

This document captures the “why” behind key architectural and implementation choices in this repository.
It is intended to help future maintainers (including Future Us) understand what we optimized for, what we traded off, and what we explicitly avoided.

> ADR-style note: These are lightweight Architecture Decision Records. Each decision includes context, decision, rationale, and consequences.

---

## DD-001 — Library-first design (host-agnostic)

**Status:** Accepted  
**Date:** 2026-01-06

### Context
We need a PDF conversion capability that can be reused by multiple applications (scheduled jobs today, possibly an IIS/API service or a worker later). Prior versions mixed ingestion, conversion, and console output in a single executable.

### Decision
Implement PDF conversion as a **.NET library** that exposes clear request/response models and can be embedded in any host.

### Rationale
- Enables reuse across apps without duplicating conversion logic
- Keeps hosting concerns (IIS/service/console) out of core conversion code
- Reduces risk when future deployment architecture changes

### Consequences
- The demo/runner is a separate project
- Logging and persistence are “opt-in” behaviors owned by the host

---

## DD-002 — Deterministic converter order with fallback chain

**Status:** Accepted  
**Date:** 2026-01-06

### Context
Conversion engines vary by fidelity, speed, licensing, and environment availability. We need a predictable approach that works in both developer machines and locked-down servers.

### Decision
Attempt converters in strict order:

1. Aspose (primary)
2. LibreOffice headless (fallback)
3. OpenOffice headless (fallback)

### Rationale
- Aspose provides high-quality conversion and supports Office formats directly
- LibreOffice/OpenOffice provide “binary available” fallbacks where allowed
- Deterministic order simplifies debugging, auditing, and expectations

### Consequences
- Report must capture each attempt and failure reason
- Converter discovery is part of the library but runtime availability is environment-dependent

---

## DD-003 — Missing binaries are not treated as failures

**Status:** Accepted  
**Date:** 2026-01-06

### Context
LibreOffice/OpenOffice may be missing or not installable on some servers. In those environments, the absence of a binary should not mark the document as “bad,” only “not convertible here.”

### Decision
When a converter is not available, throw `ConverterMissingException` and allow the chain to continue (or allow the host to skip).

### Rationale
- Distinguishes “bad file” from “missing dependency”
- Supports multi-environment deployments (dev, QA, prod) without forcing parity

### Consequences
- Hosts may track “pending” conversions separately from “failed” conversions
- Reports should clearly flag missing-binary cases

---

## DD-004 — Structured JSON ConversionReport as a first-class output

**Status:** Accepted  
**Date:** 2026-01-06

### Context
Console logs and raw exception strings don’t provide reliable auditability. We need a durable record that explains what happened per conversion.

### Decision
The library produces a structured `ConversionReport` containing:
- correlationId
- per-converter attempt records (duration, success, error)
- selected converter (if successful)

Hosts may serialize this report to JSON.

### Rationale
- Makes conversion behavior observable and testable
- Enables consistent reporting across hosts (service/API/console)
- Supports future central logging and telemetry (without redesign)

### Consequences
- Slightly more code, but far better diagnostics
- Hosts must decide where the report is stored (DB, blob, log aggregator)

---

## DD-005 — SQLite is demo/backup only (never a primary dependency)

**Status:** Accepted  
**Date:** 2026-01-06

### Context
The long-term target system will accept a file and return a PDF to another application. We still want a simple way to validate conversions locally and keep a fallback copy.

### Decision
Use SQLite only as:
- a **demo harness persistence layer**
- an optional **local backup store**

The library’s conversion pipeline does not require SQLite.

### Rationale
- Keeps the core reusable
- SQLite is easy for demos, testing, and “last resort backup”
- Avoids coupling conversion to a specific database vendor

### Consequences
- Demo app owns DB paths, migrations, and persistence
- Production hosts may use a different persistence mechanism

---

## DD-006 — Paths: config relative to EXE, CLI args relative to current directory

**Status:** Accepted  
**Date:** 2026-01-06

### Context
We observed confusion when resolving relative paths:
- Config files are copied to output and typically assumed relative to the EXE
- CLI paths should behave like typical command-line tools (relative to current directory)

### Decision
- **Config paths** (temp, license path, etc.) resolve relative to `AppContext.BaseDirectory`
- **CLI arguments** resolve relative to `Environment.CurrentDirectory`

### Rationale
- Makes runtime behavior stable and predictable
- Matches common developer expectations

### Consequences
- Demo runner contains two different “resolve path” helpers
- Documentation should call this out (README does)

---

## DD-007 — Embedded SQL migrations for portability

**Status:** Accepted  
**Date:** 2026-01-06

### Context
We want a simple “clone and run” experience without requiring external migration tools.

### Decision
Store SQL migration scripts as embedded resources and apply them on startup via `SqlBootstrapper`.

### Rationale
- Portable: no extra tooling required
- Self-contained: demo can initialize itself
- Suitable for SQLite backup DB needs

### Consequences
- We must avoid duplicated schema changes (each column introduced once)
- Schema versioning lives in `SchemaMigrations`

---

## DD-008 — Copilot instructions are part of the repo

**Status:** Accepted  
**Date:** 2026-01-06

### Context
AI code suggestions are helpful but can drift architecture (e.g., introducing web assumptions, mixing demo concerns into library, or writing files to disk).

### Decision
Add `.github/copilot-instructions.md` to enforce:
- library-first constraints
- converter order and error handling rules
- no hidden coupling to IIS/services/UI

### Rationale
- Reduces churn and architectural drift
- Helps new contributors align with the project quickly

### Consequences
- Instructions should be updated when architecture changes
- Reviewers can reference this file when suggestions conflict with repo rules

---

## Glossary

- **Host**: The application that calls the library (console app, service, API, job)
- **Converter**: A backend that transforms input bytes → PDF bytes (Aspose/LibreOffice/OpenOffice)
- **Attempt**: A single converter try, recorded in the report
- **Report**: Structured data describing the conversion process

---

## Future Decisions (Not Yet Taken)

These topics are intentionally left open:
- Standard logging sink interface for production (HTTP, file, event log, etc.)
- Hosting model (Windows service vs IIS vs container)
- Concurrency model (parallel conversions, rate limiting, queue-based processing)
- Central reporting storage (DB2, SQL Server, object storage, etc.)
