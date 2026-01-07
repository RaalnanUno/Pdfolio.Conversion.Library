### ADR: PDF Conversion Execution Model

**Status:** Accepted (Initial Implementation)

**Context**
The existing scheduled job (EVAuto) scans SQL Server for records that contain a source File BLOB but do not yet have a PDF BLOB. When such records are found, EVAuto performs document-to-PDF conversion and writes the resulting PDF back to the database.

A new shared conversion component (`Pdfolio.Conversion.Library`) has been introduced to standardize and centralize document conversion logic. A design decision was needed on whether this logic should be invoked in-process by EVAuto or hosted as a separate service (e.g., HTTP API).

---

**Decision**
For the initial implementation, **EVAuto will invoke `Pdfolio.Conversion.Library` directly, in-process**, rather than calling an external HTTP-based service.

The conversion library will remain a pure class library that:

* Accepts document data (bytes/streams) and conversion options
* Returns PDF output and structured success/failure information
* Has no knowledge of databases, scheduling, CLI flags, or filesystem layout

EVAuto will continue to own:

* Database reads and writes (File BLOB and PDF BLOB)
* Record selection logic
* Retry, logging, and failure handling
* Scheduling and execution timing

---

**Rationale**

* Matches the current batch-oriented execution model
* Avoids unnecessary network hops, authentication, and timeout concerns
* Minimizes deployment and operational complexity
* Keeps conversion logic reusable without forcing a service boundary
* Enables faster validation and rollout with lower risk

---

**Consequences**

* PDF conversion runs within the EVAuto process
* Conversion failures surface directly in the job context
* Aspose licensing and configuration are managed alongside EVAuto

This approach does not prevent future externalization.

---

**Future Considerations (Not Implemented Yet)**
If additional consumers require PDF conversion, or if isolation/scalability becomes a concern, the conversion library can be hosted behind:

* A background worker / queue-based service, or
* An HTTP API for on-demand conversion

The current design intentionally keeps these options open without requiring changes to the library itself.
