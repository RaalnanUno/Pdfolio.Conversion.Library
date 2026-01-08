## Backlog Item: Optional File-System Save for PDF Conversion (Opt-In)

### Summary

Add an **opt-in** capability to save generated PDFs to the filesystem (next to the original file) as a *non-blocking side effect* of PDF conversion. This is intended as a **last-resort safety valve** and debugging aid, not the primary persistence mechanism.

---

### Background

PDF conversion is handled by **Pdfolio.Conversion.Library**, with final persistence performed by EVAuto.
In rare failure scenarios (e.g., repeated downstream persistence failures), it can be useful to have a disk-based copy of the generated PDF for inspection, manual recovery, or temporary workflows.

This feature must:

* Never interfere with normal conversion
* Never cause conversion to fail
* Be fully opt-in and disabled by default

---

### Requirements

#### Functional

* Allow PDFs to be written to disk **only when explicitly enabled**
* Default behavior remains unchanged (no file-system writes)
* Disk save failures must **not throw**
* Disk save success/failure must be recorded in conversion metadata

#### Non-Functional

* No breaking API changes
* No new required configuration
* Safe for use in production environments
* Easy to disable globally

---

### Proposed Design

* Implement as a **decorator** around `IPdfConverter`
* Controlled via configuration (e.g. `EnableDiskSave`)
* Activated in the factory, not in calling code
* Uses existing conversion metadata to record results

This keeps side effects isolated and observable.

---

### Files / Projects Impacted

#### Pdfolio.Conversion.Library

* `Converters/DiskSavePdfConverter.cs`

  * Writes PDF to disk if enabled
  * Records success/failure as a `ConversionStep`
* `Models/ConversionRequest.cs`

  * Optional fields:

    * `OriginalFullPath`
    * `SavePdfNextToOriginal`
    * `OutputPdfFileName`
* `Factory/PdfConverterFactory.cs`

  * Wraps base converter when `EnableDiskSave = true`

#### Pdfolio.Conversion.Library.Demo

* `Program.cs`

  * Enables disk save via config
  * Demonstrates opt-in behavior

---

### Acceptance Criteria

* [ ] Conversion succeeds even if disk write fails
* [ ] Disk save is disabled by default
* [ ] When enabled, PDFs are written next to originals
* [ ] Conversion report includes a `SavedPdfToDisk` step
* [ ] No changes required in EVAuto to support this feature
* [ ] Demo project shows working example

---

### Out of Scope

* Using the filesystem as a primary persistence mechanism
* Automatic cleanup of disk-saved PDFs
* Mandatory configuration changes

---

### Why This Matters

This provides a **controlled escape hatch** for troubleshooting and recovery without compromising the reliability-first handoff model. It adds flexibility without adding risk.

---

### Notes

This feature is intentionally optional and should be treated as a **backup aid**, not a standard workflow.
