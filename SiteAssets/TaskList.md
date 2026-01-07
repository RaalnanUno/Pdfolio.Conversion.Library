## Pdfolio Conversion – Implementation Task Checklist

> This checklist reflects the current state of the Pdfolio conversion pipeline and serves as a bridge between the sequence diagram, implementation files, and upcoming enhancements.

---

### 🧱 Project Structure & Build Stability

* [x] Create `Pdfolio.Conversion.Library` as a standalone class library
* [x] Isolate document-to-PDF logic from application concerns
* [x] Consolidate conversion dependencies to **Aspose.Total**
* [x] Ensure the library builds independently of any host application
* [x] Remove application configuration, logging, and filesystem decisions from the library

---

### 🧪 Demo / Host Application Setup

* [x] Create `Pdfolio.Conversion.Library.Demo` as an executable project
* [x] Reference conversion logic via `ProjectReference` (not NuGet)
* [x] Establish minimal configuration dependencies (`Microsoft.Extensions.Configuration*`)
* [x] Stabilize NuGet versions to .NET 8–compatible packages
* [x] Verify build consistency across multiple machines
* [x] Resolve solution build issues caused by non-SDK website projects

---

### 🔁 Runtime Execution Flow (WSD Alignment)

* [x] Accept input file path via command-line arguments
* [x] Resolve input file path to an absolute path
* [x] Load runtime configuration from `appsettings.json`
* [x] Read source document bytes from the filesystem
* [x] Pass document data into the conversion library
* [x] Perform conversion using Aspose.Total
* [x] Return PDF bytes and conversion status to the host application
* [x] Write PDF output to a default runtime directory
* [x] Surface success/failure information to the console

---

### 🧠 Conversion Library Responsibilities

* [x] Provide a clean, reusable conversion API
* [x] Detect and handle supported Office document formats
* [x] Centralize Aspose license initialization
* [x] Avoid direct knowledge of file paths, flags, or CLI arguments
* [x] Return structured results (success, output, errors)

---

### 📁 File System & Output Behavior (Planned)

* [ ] Add optional CLI flag to save PDF alongside the source document
* [ ] Centralize output path resolution in the demo application
* [ ] Preserve default behavior when flag is not present
* [ ] Prevent silent overwrites of existing PDF files
* [ ] Improve console messaging to clearly show output location

---

### 🧭 Future-Proofing (Not Started)

* [ ] Add structured conversion summary (engine used, duration, output path)
* [ ] Introduce fallback conversion engine (e.g., LibreOffice)
* [ ] Support batch or directory-based conversions
* [ ] Add automated smoke tests using sample documents
* [ ] Prepare conversion library for containerized execution

---

## Why this checklist matters

* Connects **design intent** to **actual code**
* Shows clear forward progress without overcommitting
* Makes review easy for both technical and non-technical stakeholders
* Leaves a clean audit trail for future refactors