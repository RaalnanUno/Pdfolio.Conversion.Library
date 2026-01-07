Perfect idea — this is exactly the right time to capture it while the context is fresh.

Below is a **human-sounding backlog addendum** with a **clear to-do list**, broken down by **files and methods**, without over-specifying implementation details. This reads like something a senior engineer would leave for themselves or a teammate.

---

## Backlog Addendum: Optional Output Location Flag

### Context

Currently, the demo application produces PDF output relative to its runtime working directory (typically the `bin` folder). While this is fine for development, it’s not always the most intuitive behavior when converting files from arbitrary locations.

There is interest in adding an **optional flag** that allows the converted PDF to be saved **alongside the source document** instead.

This should be additive behavior and **not change the default output location** unless explicitly requested.

---

## Proposed Behavior (High Level)

* Default behavior remains unchanged
* When a flag is provided (e.g. `--output-near-source`):

  * The PDF is written to the same directory as the input file
  * The output filename mirrors the input name with a `.pdf` extension
* The library itself should remain unaware of CLI flags or filesystem decisions

---

## To-Do / Design Notes (By Area)

### 1. Demo Application – Argument Parsing

**File:** `Program.cs` (or equivalent entry point)

* Add support for an optional command-line flag

  * Example: `--output-near-source`
* Validate flags independently of file path arguments
* Ensure missing or unknown flags fail gracefully with a helpful message

**Notes:**

* Argument parsing should remain simple (manual parsing is acceptable)
* Avoid introducing heavy CLI frameworks unless complexity increases

---

### 2. Demo Application – Output Path Resolution

**File:** Likely `Program.cs` or a small helper (e.g. `OutputPathResolver.cs`)

* Determine output path based on:

  * Input file path
  * Presence/absence of the output flag
* If flag is present:

  * Use `Path.GetDirectoryName(inputPath)`
* If flag is absent:

  * Use existing default behavior
* Centralize this logic so it’s easy to change later

---

### 3. Conversion Library – API Expectations

**File:** Conversion entry point (e.g. `DocumentConverter.cs`)

* Confirm the library:

  * Accepts an explicit output path or stream
  * Does *not* compute filesystem locations internally
* If needed:

  * Add or clarify method overloads to accept output destination explicitly

**Notes:**

* The library should not infer intent from file paths
* The caller owns “where does this get written”

---

### 4. Error Handling & Messaging

**Files:** Demo application

* Improve console output to clearly state:

  * Input file path
  * Output file path
  * Whether default or “near source” mode was used
* Ensure failure cases indicate *where* output was expected to go

---

### 5. Backward Compatibility & Safety Checks

* Ensure:

  * Existing scripts still work without modification
  * No files are overwritten silently unless explicitly intended
* Consider:

  * Warning if output file already exists
  * Optional future flag for overwrite behavior (out of scope for now)

---

## Out of Scope (For This Item)

* Persistent configuration via `appsettings.json`
* Advanced CLI parsing frameworks
* Multiple output destinations
* Batch processing or directory recursion

---

## Why This Is Worth Doing

* Improves usability for ad-hoc conversions
* Makes demo behavior align with user expectations
* Keeps responsibilities cleanly separated between app and library
* Provides a foundation for future CLI enhancements without locking in design prematurely

---

If you want next, I can:

* Turn this into **checkbox-style acceptance criteria**
* Sketch the **exact method signatures** without writing code yet
* Write a **one-paragraph Jira comment** version for quick updates

Just tell me how formal you want it.
