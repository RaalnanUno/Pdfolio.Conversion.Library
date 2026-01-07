# Copilot Instructions – Pdfolio.Conversion.Library

This repository contains a .NET 8 PDF conversion library and demo application.
Copilot should follow these rules strictly.

---

## Project Purpose

Pdfolio is a **library-first** PDF conversion system.

- Primary converter: **Aspose**
- Fallback converters: **LibreOffice**, then **OpenOffice**
- The library returns PDFs and structured JSON conversion reports
- SQLite is used only as a **local backup / demo store**, never as a primary system

The demo app exists only to exercise the library.

---

## Architecture Rules

- Pdfolio.Conversion.Library is a **pure library**
  - No console output
  - No file system assumptions outside temp paths
  - No UI concerns

- Pdfolio.Conversion.Library.Demo:
  - May write to console
  - May parse CLI args
  - May create local SQLite backup DBs

---

## Conversion Rules

- Always attempt converters in this order:
  1. Aspose
  2. LibreOffice (headless)
  3. OpenOffice (headless)

- Converter chaining must:
  - Capture success/failure per attempt
  - Record duration
  - Record error messages
  - Produce a ConversionReport object

- Missing binaries (LibreOffice/OpenOffice) must:
  - Throw ConverterMissingException
  - NOT be treated as a failure

---

## Database Rules (SQLite)

- SQLite is for:
  - Local backup
  - Demo visibility
- Never design SQLite as a required dependency
- Migrations use embedded SQL scripts
- Each column must be introduced **exactly once**
- Do not duplicate schema changes across scripts

---

## File & Path Rules

- CLI arguments resolve relative paths using:
  - Environment.CurrentDirectory
- Internal library paths resolve relative to:
  - AppContext.BaseDirectory
- Temp folders must be created defensively

---

## Error Handling

- Prefer structured error objects over raw strings
- Never swallow exceptions silently
- Always preserve original exception context

---

## Coding Style

- .NET 8 / C# 12
- Nullable reference types enabled
- Explicit types preferred in public APIs
- Avoid magic strings
- Prefer small, composable classes

---

## What NOT to do

- Do NOT introduce web APIs or IIS assumptions
- Do NOT add UI frameworks
- Do NOT write PDFs directly to disk in the library
- Do NOT couple library code to the demo app

---

## When Unsure

If a design decision is ambiguous:
- Prefer **library purity**
- Prefer **explicit configuration**
- Prefer **testability over convenience**
