# ADR-004: PDF Conversion Decorator and Opt-In Disk Save Behavior

## Status

Accepted

## Date

2026-01-07

## Context

The existing PDF conversion workflow processes source documents stored in a database (as BLOBs) and produces corresponding PDF BLOBs for persistence. Historically, some workflows relied on side effects such as saving PDFs to disk next to their source files (e.g., OpenOffice-based pipelines).

As part of retiring legacy conversion mechanisms and introducing a modular, extensible PDF conversion library, we needed to:

* Preserve backward compatibility for existing consumers
* Avoid introducing mandatory filesystem side effects
* Support legacy and operational workflows that still require PDFs on disk
* Ensure conversion failures and side-effect failures are observable but isolated
* Enable future expansion (e.g., containers, services, alternate outputs)

The core requirement was to add optional “save PDF to disk” behavior **without altering the core conversion contract or breaking existing callers**.

## Decision

We introduced a **decorator-based architecture** around the `IPdfConverter` abstraction and implemented an optional `DiskSavePdfConverter`.

Key decisions:

1. **Decorator Pattern**

   * Disk persistence is implemented as a wrapper (`DiskSavePdfConverter`) around an existing `IPdfConverter`
   * Core conversion logic remains unchanged and side-effect free
   * Additional behaviors can be composed without modifying converters

2. **Opt-In Behavior**

   * Disk saving is disabled by default
   * Enabled explicitly via configuration (`EnableDiskSave`) and request flags
   * Existing consumers experience no behavior change

3. **Non-Breaking API Evolution**

   * `ConversionRequest` was extended with optional fields:

     * `OriginalFullPath`
     * `SavePdfNextToOriginal`
     * `OutputPdfFileName`
   * All new fields are nullable or defaulted
   * Existing call sites compile and run unchanged

4. **Failure Isolation**

   * Disk write failures do **not** fail PDF conversion
   * Failures are recorded as structured `ConversionStep` entries
   * Conversion results remain usable even if disk persistence fails

5. **Factory-Based Composition**

   * `PdfConverterFactory` conditionally applies the disk-save decorator
   * Consumers configure behavior declaratively, not procedurally
   * Keeps creation logic centralized and consistent

## Consequences

### Positive

* Maintains strict backward compatibility
* Supports legacy workflows without forcing side effects on all consumers
* Improves observability by recording disk-write outcomes in conversion reports
* Encourages clean separation of concerns
* Enables future decorators (logging, metrics, retries, storage sinks)

### Tradeoffs

* Slightly increased complexity in converter composition
* Disk save behavior is not enforced centrally (by design)
* Requires consumer awareness to enable the feature explicitly

These tradeoffs are acceptable and intentional, favoring safety and extensibility over implicit behavior.

## Alternatives Considered

### 1. Always Save PDFs to Disk

**Rejected**

* Introduces unwanted side effects
* Breaks service/container compatibility
* Violates principle of least surprise

### 2. Add Disk Save Logic Inside Each Converter

**Rejected**

* Duplicates logic across implementations
* Couples conversion with I/O concerns
* Makes future maintenance and testing harder

### 3. Post-Processing Outside the Conversion Pipeline

**Rejected**

* Loses contextual metadata
* Makes failure attribution harder
* Splits responsibility across layers

## Outcome

The selected approach provides a clean, extensible, and non-breaking solution that supports both modern and legacy workflows. It aligns with long-term goals of modularization, service readiness, and operational safety.

This decision enables gradual migration away from legacy tooling while maintaining continuity for existing systems.

## Notes

This ADR intentionally favors explicit opt-in behavior and observability over implicit convenience, reflecting production stability and auditability requirements.
